class Message < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER

  property :user_id
  property :x_location, :default => 128
  property :y_location, :default => 128
  
  property :content
  
  property :date, :default => Proc.new{Time.now.to_i}
  
end