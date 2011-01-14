class Main
  before do headers "Content-Type" => "text/html; charset=utf-8" end
  
  get "/" do
    redirect "/login" unless logged_in?
    haml :map_list
  end
  
  get "/m/:map_id" do
    redirect "/login" unless logged_in?
    @map = Map.get(params[:map_id])
    redirect "/404" if @map.nil?
    
    if @user.map_id != @map.id
      @user.map_id = @map.id
      loc = @user.location
      loc.x, loc.y = @map.spawn_points.first
      loc.save
      @user.save
    end
    @users = @map.users
    @npcs = @map.npcs
    @notes = @map.notes
    
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
    user = User.all.find{|u| u.email == params[:email].downcase}
    if user && user.valid_password?(params[:password])
      user.challenges ||= []
      user.challenges = user.challenges[0...4]
      user.challenges.unshift((Digest::SHA2.new(512) << (64.times.map{|l|('a'..'z').to_a[rand(25)]}.join)).to_s)
      user.save
      $cached_users[user.id] = nil
      
      response.set_cookie("user", {
        :path => "/",
        :expires => Time.now + 2**20, #two weeks
        :httponly => true,
        :value => user.id
      })
      response.set_cookie("user_challenge", {
        :path => "/",
        :expires => Time.now + 2**20,
        :httponly => true,
        :value => user.challenges.first
      })
      redirect "/"
    else
      redirect "/login?error=incorrect"
    end
  end
  
  get "/logout" do
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
