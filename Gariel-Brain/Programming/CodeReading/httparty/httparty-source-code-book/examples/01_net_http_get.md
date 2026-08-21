---
tags:
  - code-reading
---

# Net::HTTP GET

```ruby
# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

DEFAULT_URL = "https://jsonplaceholder.typicode.com/todos/1"
BODY_PREVIEW_BYTES = 500

begin
  url = ARGV.fetch(0, DEFAULT_URL)
  uri = URI(url)

  unless uri.is_a?(URI::HTTP) && uri.hostname
    abort "Expected an absolute http:// or https:// URL"
  end

  # The request object describes one HTTP message.
  request = Net::HTTP::Get.new(uri)
  request["Accept"] = "application/json"
  request["User-Agent"] = "httparty-source-book/1.0"

  # The connection object describes how to reach the origin.
  http = Net::HTTP.new(uri.hostname, uri.port)
  http.use_ssl = uri.scheme == "https"
  http.open_timeout = 5
  http.read_timeout = 10
  http.write_timeout = 10

  puts "Request"
  puts "  method: #{request.method}"
  puts "  URI:    #{uri}"
  puts "  target: #{request.path}"
  puts "  origin: #{uri.scheme}://#{uri.hostname}:#{uri.port}"
  puts

  # Net::HTTP owns the connection lifecycle and transports the request.
  response = http.start do |connection|
    connection.request(request)
  end

  puts "Response"
  puts "  class:        #{response.class}"
  puts "  status:       #{response.code} #{response.message}"
  puts "  content-type: #{response["content-type"].inspect}"
  puts "  content-size: #{response.body&.bytesize || 0} bytes"

  case response
  when Net::HTTPSuccess
    puts "  category:     success"
  when Net::HTTPRedirection
    puts "  category:     redirection"
    puts "  location:     #{response["location"].inspect}"
  when Net::HTTPClientError
    puts "  category:     client error"
  when Net::HTTPServerError
    puts "  category:     server error"
  else
    puts "  category:     other"
  end

  body = response.body.to_s
  preview = body.byteslice(0, BODY_PREVIEW_BYTES)

  puts
  puts "Body preview"
  puts preview
  puts "..." if body.bytesize > BODY_PREVIEW_BYTES

  # Parsing is deliberately separate from the network exchange.
  if response["content-type"].to_s.include?("application/json")
    parsed = JSON.parse(body)
    puts
    puts "Parsed JSON"
    p parsed
  end

rescue URI::InvalidURIError => error
  warn "Invalid URI: #{error.message}"
  exit 1
rescue JSON::ParserError => error
  warn "The response claimed to be JSON but parsing failed: #{error.message}"
  exit 1
rescue Timeout::Error, SocketError, SystemCallError, OpenSSL::SSL::SSLError => error
  warn "Transport failed (#{error.class}): #{error.message}"
  exit 1
end
```
