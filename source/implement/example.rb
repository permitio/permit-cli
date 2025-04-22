require 'webrick'
require 'permit'

permit = Permit.new("{{API_KEY}}", "http://localhost:7766")

server = WEBrick::HTTPServer.new(Port: 4000)

server.mount_proc '/' do |*, res|
res['Content-Type'] = 'application/json'

    permitted = permit.check("{{USER_ID}}", "{{ACTIONS}}", "{{RESOURCES}}")
    if permitted
        res.status = 200
        res.body = { result: "{{FIRST_NAME}} {{LAST_NAME}} is PERMITTED to {{ACTIONS}} {{RESOURCES}}!" }.to_json
    next
    end
    res.status = 403
    res.body = { result: "{{FIRST_NAME}} {{LAST_NAME}} is NOT PERMITTED to {{ACTIONS}} {{RESOURCES}}!" }.to_json

end

trap 'INT' do server.shutdown end

server.start