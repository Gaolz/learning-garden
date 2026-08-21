# frozen_string_literal: true

require "httparty"

DEFAULT_URL = "https://jsonplaceholder.typicode.com/todos/1"

FOCUS_METHODS = %i[
  get
  perform_request
  build_request
  initialize
  perform
  validate
  setup_raw_request
  http
  call
  handle_response
  parsed_response
  parse_response
].freeze

def httparty_frame?(trace)
  trace.path.include?("/httparty") &&
    trace.defined_class.to_s.include?("HTTParty") &&
    FOCUS_METHODS.include?(trace.method_id)
end

depth = 0

tracer = TracePoint.new(:call, :return) do |trace|
  next unless httparty_frame?(trace)

  owner = trace.defined_class
  label = "#{owner}##{trace.method_id}"

  if trace.event == :call
    puts "#{"  " * depth}→ #{label} (#{File.basename(trace.path)}:#{trace.lineno})"
    depth += 1
  else
    depth -= 1
    puts "#{"  " * depth}← #{label} => #{trace.return_value.class}"
  end
end

url = ARGV.fetch(0, DEFAULT_URL)

response = tracer.enable do
  result = HTTParty.get(url, headers: { "Accept" => "application/json" })

  puts "\n--- HTTParty.get returned #{result.class}; parsing explicitly ---"
  result.parsed_response
  result
end

puts "\nFinal objects"
puts "  wrapper:  #{response.class}"
puts "  request:  #{response.request.class}"
puts "  raw:      #{response.response.class}"
puts "  parsed:   #{response.parsed_response.class}"

