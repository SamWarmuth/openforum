class Map < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER

  property :name
    
  property :date, :default => Proc.new{Time.now.to_i}
  property :spawn_points, :default => [[128,128]], :cast_as => ['Array']
  
  def walls
    Wall.by_map_id(:key => self.id)
  end
  def users
    User.by_map_id(:key => self.id)
  end
  def npcs
    NPC.by_map_id(:key => self.id)
  end
end
