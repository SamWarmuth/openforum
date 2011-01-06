class Map < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER

  property :name
  property :walls, :cast_as => Hash
  #walls[[x,y]] == true   :: no falses, just remove them.
  
  property :content
  
  property :date, :default => Proc.new{Time.now.to_i}
  
end