class Main
  helpers do
    def logged_in?
      return false unless request.cookies.has_key?("user_challenge") && request.cookies.has_key?("user")
      user = $cached_users[request.cookies['user']]
      if user.nil?
        user = User.get(request.cookies['user'])
        $cached_users[user.id] = user unless user.nil?
      end
      
      return false if user.nil?
      return false unless user.challenges && user.challenges.include?(request.cookies['user_challenge'])

      @user = user
      return true
    end
    
    def load_map(map)
      @map = map
      if @user.map_id != @map.id
        Pusher[@user.map_id].trigger_async('edituser', {:user_id => @user.id, :name => @user.name, :type => "destroy"}.to_json)
        @user.map_id = @map.id
        @user.save
        $cached_users[@user.id] = nil
        loc = @user.location
        Pusher[@user.map_id].trigger_async('edituser', {:user_id => @user.id,
                                                    :type => "create",
                                                    :name => @user.name,
                                                    :x => loc.x,
                                                    :y => loc.y,
                                                    :color => @user.color}.to_json)
      end
      @users = @map.users
      @npcs = @map.npcs
      @notes = @map.notes
      @teleporters = @map.teleporters
      @walls = @map.walls
    end
    
    def set_cookies
      return false if @user.nil?
      @user.challenges ||= []
      @user.challenges = @user.challenges[0...4]
      @user.challenges.unshift((Digest::SHA2.new(512) << (64.times.map{|l|('a'..'z').to_a[rand(25)]}.join)).to_s)
      @user.save
      $cached_users[@user.id] = nil
      
      response.set_cookie("user", {
        :path => "/",
        :expires => Time.now + 2**20, #two weeks
        :httponly => true,
        :value => @user.id
      })
      response.set_cookie("user_challenge", {
        :path => "/",
        :expires => Time.now + 2**20,
        :httponly => true,
        :value => @user.challenges.first
      })
    end
    
    
    def generate_roman_name
      names = %w{Aelianus Aelius Agrippa Albanus Albus Antonius Appius Aquila Aquilinus Atilius Augustus Avitus Blasius Brutus Caelius Camillus Cassius Cato Celsus Claudius Cornelius Crispus Decimus Drusus Fabius Faustus Festus Florus Gaius Flavius Julius Lucius Marcus Marius Martinus Maximus Otho Paulinus Paulus Plinius Pontius Quintus Regulus Rufinus Seneca Septimus Servius Sextus Tacitus Tatius Titianus Titus Valerius Vergilius Vibius Vincius Vitus}
      
      [names[rand(names.size)], names[rand(names.size)]].join(" ")
    end
  end
end
