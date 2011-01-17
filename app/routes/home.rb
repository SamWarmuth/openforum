class Main
  before do headers "Content-Type" => "text/html; charset=utf-8" end
  
  get "/" do
    logged_in?
    haml :welcome, :layout => false
  end
  
  get "/m/:map_id" do
    if logged_in? == false
      @new_user = true
      @user = User.new
      @user.name = generate_roman_name
      @user.save
      set_cookies
    end
    
    @map = Map.get(params[:map_id])
    redirect "/404" if @map.nil?
    
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
    haml :index
  end
  
  get "/css/style.css" do
    content_type 'text/css', :charset => 'utf-8'
    sass :style
  end
  
  get "/login" do
    haml :login, :layout => false
  end

  post "/login" do
    @user = User.all.find{|u| u.email == params[:email].downcase}
    if @user && @user.valid_password?(params[:password])
      set_cookies
      redirect "/"
    else
      redirect "/login?error=incorrect"
    end
  end
  
  get "/logout" do
    @user.map_id = nil
    @user.save
    $cached_users[@user.id] = nil
    response.set_cookie("user", {
      :path => "/",
      :expires => Time.now + 2**20,
      :httponly => true,
      :value => ""
    })
    response.set_cookie("user_challenge", {
      :path => "/",
      :expires => Time.now + 2**20,
      :httponly => true,
      :value => ""
    })
    redirect "/login"
  end

  get "/signup" do
    redirect "/" if logged_in?
    haml :signup, :layout => false
  end
  
  post "/signup" do
    redirect "/signup?error=email" unless User.all.find{|u| u.email == params[:email].downcase}.nil?
    redirect "/signup?error=password" unless params[:password] == params[:password2]
    redirect "/signup?error=empty" if params[:name].empty? || params[:email].empty? || params[:password].empty?
    
    user = User.new
    location = Location.new
    location.save
    user.location_id = location.id
    user.name = params[:name]
    user.email = params[:email].downcase
    user.set_password(params[:password])
    user.save
    redirect "/login?success=created"
  end
  
  post "/change-name" do
    return 403 unless logged_in?
    return 400 if params[:name].empty?
    @user.name = params[:name]
    @user.save
    #push name change to users
  end
  
  post "/set-account-details" do
    return 403 unless logged_in?
    return false unless @user.password_hash.nil?
    return 400 if (params[:name].empty? || params[:email].empty? || params[:password].empty?)
    @user.name = params[:name]
    @user.email = params[:email]
    @user.set_password(params[:password])
    @user.save
    #push name change to users
  end
  
  post "/teleport" do
    return 403 unless logged_in?
    return 400 if params[:tele_id].empty?
    teleporter = Teleporter.get(params[:tele_id])
    if @user.location_ids[teleporter.destination_id].nil?
      location = Location.new
      location.save
      @user.location_ids[teleporter.destination_id] = location.id
    else
      location = Location.get(@user.location_ids[teleporter.destination_id])
    end
    
    location.x, location.y = teleporter.destination_location
    location.save
    
    return 404 if teleporter.nil?
    return 404 if teleporter.destination_id.nil?
    return "/m/#{teleporter.destination_id}"
  end
  
  get "/leave-room" do
    return 403 unless logged_in?
    return 202 if @user.map_id != params[:map_id]
    map_id = @user.map_id
    @user.map_id = nil
    @user.save
    $cached_users[@user.id] = nil
    Pusher[map_id].trigger_async('edituser', {:user_id => @user.id, :name => @user.name, :type => "destroy"}.to_json)
    return 200
  end
  
  post "/update-location" do
    return 403 unless logged_in?
    return 400 if (params[:x].empty? || params[:y].empty?)
    
    x = params[:x].to_i - params[:x].to_i % 16
    y = params[:y].to_i - params[:y].to_i % 16
    
    Pusher[@user.map_id].trigger_async('locationupdate', {:entityID => @user.id,
                                                          :xLocation => x, 
                                                          :yLocation => y,
                                                          :date => params[:date]}.to_json)
                                                          
    
    if params[:store] == "true"
      location = @user.location
      location.x = x
      location.y = y
      location.save
      $locations[@user.id][@user.map_id] = nil
    end
    
    
    #this is a hack. If the user isn't actually in a map (probably due to the refresh bug), it adds them now.
    if @user.map_id.nil?
      @user.map_id = params[:map] 
      @user.save
      $cached_users[@user.id] = nil
      Pusher[@user.map_id].trigger_async('edituser', {:user_id => @user.id,
                                                  :type => "create",
                                                  :name => @user.name,
                                                  :x => x,
                                                  :y => y,
                                                  :color => @user.color}.to_json)
    end
    
    return 200
  end
  
  post "/send-message" do
    return 403 unless logged_in?    
    return 400 if (params[:x].empty? || params[:y].empty? || params[:content].empty?)
    message = Message.new
    message.content = params[:content]
    message.x_location = params[:x].to_i
    message.y_location = params[:y].to_i
    message.distance = params[:distance].to_i
    message.user_id = @user.id
    message.map_id = @user.map_id
    
    Pusher[message.map_id].trigger_async('message', {:entityID => @user.id,
                                         :username => @user.name,
                                         :xLocation => message.x_location, 
                                         :yLocation => message.y_location,
                                         :distance => params[:distance],
                                         :content => message.content}.to_json)
                                         
    message.save

    return 200
  end
  
  post "/edit-wall" do
    return 403 unless logged_in?    
    return 400 if params[:type].empty?
    return 403 if @user.power == 0
    wall = nil
    if params[:type] == "create"
      return 400 if (params[:x].empty? || params[:y].empty?)
      
      wall = Wall.new
      wall.x = params[:x].to_i
      wall.y = params[:y].to_i
      wall.creator_id = @user.id
      wall.power = @user.power
      wall.map_id = @user.map_id
      wall.save
      wall_id = wall.id
      $walls[wall.map_id] << wall unless $walls[wall.map_id].nil?
      #see comment below
    else
      return 400 if (params[:wall_id].nil? || params[:wall_id].empty?)
      wall = Wall.get(params[:wall_id])
      return 404 if wall.nil?
      
      return 403 if @user.power < wall.power
      wall_id = wall.id
      wall.destroy
      #need to save the id before destruction, as it is removed.
      $walls[wall.map_id].delete_if{|w| w.id == wall_id} unless $walls[wall.map_id].nil?
      
    end
    
    
    Pusher[@user.map_id].trigger_async('editwall', {:creator_id => @user.id,
                                                :type => params[:type],
                                                :x => params[:x].to_i,
                                                :y => params[:y].to_i,
                                                :wall_id => wall_id,
                                                :power => @user.power}.to_json)
    
    
    return wall.id
  end
  
end
