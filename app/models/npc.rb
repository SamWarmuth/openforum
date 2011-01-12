class NPC < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER
  
  property :name
  property :disabled, :default => false
  
  property :date, :default => Proc.new{Time.now.to_i}
  property :color, :default => Proc.new{"#" + (1..3).map{rand(16).to_s(16)}.join}
  
  property :power, :default => 1
  # 0 can't create walls at all. 10 is maximum -- admin level.

  property :map_id
  view_by :map_id
  
  property :location_id, :default => Proc.new{loc = Location.new; loc.save; loc.id}
  
  property :message, :default => "hello"
  property :speak_every, :default => "10s"
  property :distance, :default => 128
  
  
  def location
    Location.get(self.location_id)
  end
  
  def activate
    Scheduler.every self.speak_every do
      unless Map.get(self.map_id).users.empty?
        self.speak
      end
    end
  end
  
  def speak
    loc = self.location
    Pusher[self.map_id].trigger_async('message', {:entityID => self.id,
                                                  :username => self.name,
                                                  :xLocation => loc.x, 
                                                  :yLocation => loc.y,
                                                  :distance => self.distance,
                                                  :content => self.message}.to_json)
  end
  
  
end