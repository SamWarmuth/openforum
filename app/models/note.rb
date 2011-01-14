class Note < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER
  
  property :name
  property :disabled, :default => false
  
  property :date, :default => Proc.new{Time.now.to_i}
  property :image_url, :default => "/images/question.png"
  
  property :map_id
  view_by :map_id
  
  property :location_id, :default => Proc.new{loc = Location.new; loc.save; loc.id}
  
  property :message, :default => "France is bacon."
  property :distance, :default => 128
  
  
  def location(reset=false)
    $locations[self.id] = nil if reset
    $locations[self.id] ||= Location.get(self.location_id)
  end
  
end