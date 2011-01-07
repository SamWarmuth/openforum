class Location < CouchRest::ExtendedDocument
 use_database COUCHDB_SERVER
  
  property :x, :default => 128
  property :y, :default => 128
  
end
