class User < CouchRest::ExtendedDocument
  use_database COUCHDB_SERVER
  
  property :name
  
  property :email
  property :date, :default => Proc.new{Time.now.to_i}
  property :color, :default => Proc.new{"#" + (1..3).map{rand(16).to_s(16)}.join}
  
  property :power, :default => 1
  # 0 can't create walls at all. 10 is maximum -- admin level.
  
  def set_password(password)
    self.salt = 64.times.map{|l|('a'..'z').to_a[rand(25)]}.join
    self.password_hash = (Digest::SHA2.new(512) << (self.salt + password + "thyuhwdhlbajhrqmdwxgayegpjxjdomaj")).to_s
  end
  
  
  def valid_password?(password)
    return false if (self.password_hash.nil? || self.salt.nil?)
    return ((Digest::SHA2.new(512) << (self.salt + password + "thyuhwdhlbajhrqmdwxgayegpjxjdomaj")).to_s == password_hash)
  end

  property :password_hash
  property :salt
  property :challenges
  
  property :map_id
  view_by :map_id
  
  property :location_ids, :default => {}
  
  def location
    $locations[self.id] ||= {}
    $locations[self.id][self.map_id] ||= Location.get(self.location_ids[self.map_id])
    if $locations[self.id][self.map_id].nil?
      loc = Location.new
      loc.save
      self.location_ids[self.map_id] = loc.id
      self.save
      puts "reset location for this map/user"
      $locations[self.id][self.map_id] = loc
    end
    $locations[self.id][self.map_id]
  end
  
end