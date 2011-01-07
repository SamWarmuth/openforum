class Main
  before do headers "Content-Type" => "text/html; charset=utf-8" end
  
  get "/" do
    redirect "/login" unless logged_in?
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
    user.name = params[:name]
    user.email = params[:email].downcase
    user.set_password(params[:password])
    user.calendar_id = Calendar.create(:name => user.name).id
    user.permalink = generate_permalink(user, user.name)
    user.broadcast_ids = Broadcast.all.find_all{|b| b.announce_to_new_users == true}.map(&:id)
    user.save
    redirect "/login?success=created"
  end
  
  post "/update-location" do
    return 403 unless logged_in?
    return 400 if (params[:x].empty? || params[:y].empty?)

    @user.x_location = params[:x].to_i
    @user.y_location = params[:y].to_i
    Pusher['global'].trigger_async('locationupdate', {:entityID => @user.id,
                                                :xLocation => @user.x_location, 
                                                :yLocation => @user.y_location}.to_json)
    @user.save
    
    return 200
  end
  
  post "/send-message" do
    return 403 unless logged_in?    
    return 400 if (params[:x].empty? || params[:y].empty? || params[:content].empty?)
    message = Message.new
    message.content = params[:content]
    message.x_location = params[:x].to_i
    message.y_location = params[:y].to_i
    
    Pusher['global'].trigger_async('message', {:entityID => @user.id,
                                         :username => @user.name,
                                         :xLocation => message.x_location, 
                                         :yLocation => message.y_location,
                                         :distance => 128,
                                         :content => message.content}.to_json)
                                         
    message.save

    return 200
  end
  
  post "/edit-wall" do
    return 403 unless logged_in?    
    return 400 if (params[:x].empty? || params[:y].empty? || params[:type].empty?)
    puts params.inspect
    
    if params[:type] == "create"
      wall = Wall.new
      wall.x = params[:x].to_i
      wall.y = params[:y].to_i
      wall.creator_id = @user.id
      wall.save
    else
      puts Wall.count
      wall = Wall.all.find{|w| w.x == params[:x].to_i && w.y == params[:y].to_i}
      puts wall.inspect
      wall.destroy unless wall.nil?
      puts Wall.count
    end
    
    Pusher['global'].trigger_async('editwall', {:creator_id => @user.id,
                                                :type => params[:type],
                                                :x => wall.x,
                                                :y => wall.y}.to_json)
    
  end
  
end
