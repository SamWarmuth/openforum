class Wall < CouchRest::ExtendedDocument
 use_database COUCHDB_SERVER
  
  property :x, :default => 16
  view_by :x
  property :y, :default => 16
    
  property :creator_id
  property :date, :default => Proc.new{Time.now.to_i}
  property :power, :default => 1
  
  property :map_id
  view_by :map_id
  
end