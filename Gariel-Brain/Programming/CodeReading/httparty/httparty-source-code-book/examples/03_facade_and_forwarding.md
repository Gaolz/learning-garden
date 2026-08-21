---
tags:
  - code-reading
---

# Facade and Forwarding

```ruby
# frozen_string_literal: true

module TinyParty
  module ClassMethods
    def get(path, options = {}, &block)
      puts "ClassMethods#get"
      puts "  receiver: #{self}"
      puts "  path:     #{path.inspect}"
      puts "  options:  #{options.inspect}"
      puts "  block?:   #{!block.nil?}"

      block_result = block&.call("fragment from #{path}")

      {
        receiver: self,
        path: path,
        options: options,
        block_result: block_result
      }
    end
  end

  def self.included(base)
    base.extend(ClassMethods)
  end

  class Basement
    include TinyParty
  end

  def self.get(*args, &block)
    puts "TinyParty.get"
    puts "  collected args: #{args.inspect}"
    puts "  block?:         #{!block.nil?}"

    Basement.get(*args, &block)
  end
end

result = TinyParty.get("/users/1", timeout: 5) do |fragment|
  puts "Block received: #{fragment.inspect}"
  :consumed
end

puts
puts "Method ownership"
puts "  TinyParty.get:           #{TinyParty.method(:get).owner}"
puts "  TinyParty::Basement.get: #{TinyParty::Basement.method(:get).owner}"

puts
puts "Returned value"
p result

```
