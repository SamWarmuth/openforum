class Map < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER

  property :name
  property :permalink
  view_by :permalink
    
  property :date, :default => Proc.new{Time.now.to_i}
  property :spawn_points, :default => [[128,128]], :cast_as => ['Array']
  
  property :background_tile, :default => '/images/grid.png'
  property :birds_eye_background, :default => '#FFF'
  
  property :welcome_message
  
  
  def walls
    $walls[self.id] ||= Wall.by_map_id(:key => self.id)
  end
  def users
    User.by_map_id(:key => self.id)
  end
  def npcs
    NPC.by_map_id(:key => self.id)
  end
  def notes
    Note.by_map_id(:key => self.id)
  end
  def teleporters
    Teleporter.by_map_id(:key => self.id)
  end
  def torches
    Torch.by_map_id(:key => self.id)
  end
  
  def generate_permalink
    #remove all characters that aren't a-z or 0-9
    permalink = self.name.downcase.gsub(/[^a-z^0-9]/,'')
    until (Map.by_permalink(:key => permalink).empty?)
      permalink += rand(10).to_s #add a number to the end.
    end
    self.permalink = permalink
  end
end
