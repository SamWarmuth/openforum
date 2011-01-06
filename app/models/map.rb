class Map < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER

  property :name
  #walls[[x,y]] == color (string)   :: no falses, just remove them.
    
  property :date, :default => Proc.new{Time.now.to_i}
  
end
