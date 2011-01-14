ROOT_DIR = File.expand_path(File.dirname(__FILE__)) unless defined? ROOT_DIR

require "rubygems"

begin
  require "vendor/dependencies/lib/dependencies"
rescue LoadError
  require "dependencies"
end

require "monk/glue"
require "couchrest"
require "haml"
require "sass"
require "json"
require "pusher"
require "em-http"
require "rufus/scheduler"


class Main < Monk::Glue
  set :app_file, __FILE__
  use Rack::Session::Cookie
end

# Connect to couchdb.
couchdb_url = monk_settings(:couchdb)[:url]
COUCHDB_SERVER = CouchRest.database!(couchdb_url)
$cached_users = {}
$locations = {}
$walls = {}
# Pusher Creds
Pusher.app_id = '3520'
Pusher.key = '834b3ca0e7e453c73863'
Pusher.secret = '479ee215c70a2fe36965'

# Load all application files.
Dir[root_path("app/**/*.rb")].each do |file|
  require file
end

if defined?(Scheduler).nil?
  Scheduler = Rufus::Scheduler.start_new
  
  NPC.all.each do |npc|
    next if npc.disabled
    npc.activate
  end
end


Main.run! :port => 80 if Main.run?
