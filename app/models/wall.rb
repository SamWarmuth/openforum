class Wall < CouchRest::ExtendedDocument
 use_database COUCHDB_SERVER
  
  property :x, :default => 16
  view_by :x
  property :y, :default => 16
  property :map_id
  
  property :color, :default => "#000"
  
  property :creator_id
  property :date, :default => Proc.new{Time.now.to_i}
  
end