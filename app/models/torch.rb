class Torch < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER
  
  property :name
  property :brightness, :default => 128
  property :image_url, :default => "/images/torch.png"
  
  property :map_id
  view_by :map_id
  
  property :disabled, :default => false
  property :date, :default => Proc.new{Time.now.to_i}
    
  property :location_id, :default => Proc.new{loc = Location.new; loc.save; loc.id}
  
  
  def location(reset = false)
    $locations[self.id] = nil if reset
    $locations[self.id] ||= Location.get(self.location_id)
  end
  
end