# Phase 1: Scaffold & Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-ruby:subagent-driven-development (recommended) or superpowers-ruby:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed Rails 8 forum with authentication, topic/post CRUD, and CI — real users could register and post.

**Architecture:** Rails 8 monolith with SQLite3 (migrate to PostgreSQL in Phase 3). Built-in auth via `has_secure_password`. Topics contain posts with Markdown rendering. Kamal deploys to a single VPS with Thruster for SSL termination.

**Tech Stack:** Rails 8, Ruby 3.3+, SQLite3, Tailwind CSS, Propshaft, Solid Queue, Solid Cable, Kamal, Thruster, Minitest

**Source spec:** `docs/superpowers/specs/2026-08-07-forum-capstone-design.md`

---

## File Map

```
forum/
├── app/
│   ├── models/
│   │   ├── user.rb                    # has_secure_password, has_many :topics, :posts
│   │   ├── session.rb                 # belongs_to :user (from auth generator)
│   │   ├── current.rb                 # Current attributes (from auth generator)
│   │   ├── topic.rb                   # belongs_to :user, has_many :posts, sluggable
│   │   └── post.rb                    # belongs_to :topic, :user, markdown_body
│   ├── controllers/
│   │   ├── application_controller.rb # authentication concern include
│   │   ├── concerns/
│   │   │   └── authentication.rb     # from auth generator
│   │   ├── home_controller.rb        # landing page
│   │   ├── sessions_controller.rb    # from auth generator
│   │   ├── passwords_controller.rb   # from auth generator (passwords)
│   │   ├── registrations_controller.rb # sign up (we extend)
│   │   ├── topics_controller.rb      # CRUD
│   │   └── posts_controller.rb       # create, edit, update, destroy (nested)
│   ├── views/
│   │   ├── layouts/
│   │   │   └── application.html.erb  # nav bar, flash messages
│   │   ├── home/
│   │   │   └── index.html.erb        # recent topics list
│   │   ├── sessions/
│   │   │   └── new.html.erb          # sign in form
│   │   ├── registrations/
│   │   │   └── new.html.erb          # sign up form
│   │   ├── topics/
│   │   │   ├── index.html.erb        # topic list
│   │   │   ├── show.html.erb         # topic + posts
│   │   │   ├── new.html.erb          # new topic form
│   │   │   └── edit.html.erb         # edit topic form
│   │   └── posts/
│   │       ├── _post.html.erb        # single post partial
│   │       ├── _form.html.erb        # post form partial
│   │       └── edit.html.erb         # edit post
│   └── helpers/
│       └── markdown_helper.rb        # Markdown rendering helper
├── db/
│   └── migrate/
│       ├── *_create_users.rb
│       ├── *_create_sessions.rb
│       ├── *_create_topics.rb
│       └── *_create_posts.rb
├── test/
│   ├── models/
│   │   ├── user_test.rb
│   │   ├── topic_test.rb
│   │   └── post_test.rb
│   ├── controllers/
│   │   ├── topics_controller_test.rb
│   │   └── posts_controller_test.rb
│   ├── system/
│   │   ├── auth_test.rb
│   │   ├── topics_test.rb
│   │   └── posts_test.rb
│   └── fixtures/
│       ├── users.yml
│       ├── topics.yml
│       └── posts.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── config/
│   └── deploy.yml
└── Gemfile
```

---

### Task 1: Rails 8 App Scaffold

**Files:**
- Create: `forum/` (entire Rails app directory)

- [ ] **Step 1: Generate Rails 8 app**

```bash
gem install rails --no-document
rails new forum --main --css=tailwind
```

Flags explained:
- `--main` → targets Rails main branch (Rails 8)
- `--css=tailwind` → Tailwind CSS via the tailwindcss-rails gem

- [ ] **Step 2: Enter app directory and verify**

```bash
cd forum
bin/rails server
```

Visit `http://localhost:3000`. Should see Rails welcome page.

Expected: Rails 8 welcome screen with "Rails version: 8.0.x"

- [ ] **Step 3: Verify SQLite database works**

```bash
bin/rails db:create
bin/rails db:migrate
```

Expected: No errors. `db/development.sqlite3` created.

- [ ] **Step 4: Run default tests**

```bash
bin/rails test
```

Expected: 0 tests, 0 failures (no tests written yet, but framework loads)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold Rails 8 app with Tailwind CSS"
```

---

### Task 2: Authentication with has_secure_password

**Files:**
- Create: `app/models/user.rb`, `app/models/session.rb`, `app/models/current.rb`
- Create: `app/controllers/sessions_controller.rb`, `app/controllers/registrations_controller.rb`, `app/controllers/passwords_controller.rb`
- Create: `app/controllers/concerns/authentication.rb`
- Create: `app/views/sessions/new.html.erb`, `app/views/registrations/new.html.erb`
- Create: `db/migrate/*_create_users.rb`, `db/migrate/*_create_sessions.rb`
- Create: `test/models/user_test.rb`, `test/system/auth_test.rb`
- Create: `test/fixtures/users.yml`

- [ ] **Step 1: Generate authentication scaffold**

```bash
bin/rails generate authentication
```

This generates User model with `has_secure_password`, Session model, controllers, views, migrations, and the authentication concern.

- [ ] **Step 2: Run generated migrations**

```bash
bin/rails db:migrate
```

Expected: Creates `users` and `sessions` tables.

- [ ] **Step 3: Verify generated User model**

```bash
cat app/models/user.rb
```

Expected output:
```ruby
class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }
end
```

- [ ] **Step 4: Write User model test**

File: `test/models/user_test.rb`

```ruby
require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "valid user" do
    user = User.new(
      email_address: "alice@example.com",
      password: "secret123",
      username: "alice"
    )
    assert user.valid?
  end

  test "requires email_address" do
    user = User.new(password: "secret123", username: "alice")
    assert_not user.valid?
    assert_includes user.errors[:email_address], "can't be blank"
  end

  test "email_address is normalized" do
    user = User.create!(
      email_address: "  ALICE@EXAMPLE.COM  ",
      password: "secret123",
      username: "alice"
    )
    assert_equal "alice@example.com", user.email_address
  end

  test "email_address is unique" do
    User.create!(email_address: "bob@example.com", password: "secret123", username: "bob")
    duplicate = User.new(email_address: "bob@example.com", password: "other456", username: "bob2")
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:email_address], "has already been taken"
  end
end
```

- [ ] **Step 5: Add username to users**

The auth generator doesn't add `username`. Add it.

```bash
bin/rails generate migration AddUsernameToUsers username:string:uniq
```

Edit migration to ensure `null: false`:

```ruby
class AddUsernameToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :username, :string, null: false
    add_index :users, :username, unique: true
  end
end
```

```bash
bin/rails db:migrate
```

- [ ] **Step 6: Update User model with username validation**

Edit `app/models/user.rb`:

```ruby
class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :username, presence: true,
            uniqueness: { case_sensitive: false },
            length: { minimum: 3, maximum: 30 },
            format: { with: /\A[a-zA-Z0-9_-]+\z/, message: "only letters, numbers, hyphens, and underscores" }

  normalizes :username, with: ->(u) { u.strip }
end
```

- [ ] **Step 7: Run user tests**

```bash
bin/rails test test/models/user_test.rb
```

Expected: All tests pass.

- [ ] **Step 8: Write system test for auth flows**

File: `test/system/auth_test.rb`

```ruby
require "application_system_test_case"

class AuthTest < ApplicationSystemTestCase
  test "sign up with valid details" do
    visit new_registration_path
    fill_in "Email address", with: "newuser@example.com"
    fill_in "Username", with: "newuser"
    fill_in "Password", with: "secret123"
    fill_in "Password confirmation", with: "secret123"
    click_button "Sign up"

    assert_text "Welcome"
    assert_text "newuser"
  end

  test "sign up with mismatched passwords" do
    visit new_registration_path
    fill_in "Email address", with: "newuser@example.com"
    fill_in "Username", with: "newuser"
    fill_in "Password", with: "secret123"
    fill_in "Password confirmation", with: "different"
    click_button "Sign up"

    assert_text "error"
  end

  test "sign in and sign out" do
    user = users(:alice)

    visit new_session_path
    fill_in "Email address", with: user.email_address
    fill_in "Password", with: "password123"
    click_button "Sign in"

    assert_text user.username

    click_button "Sign out"
    assert_no_text user.username
  end
end
```

Fixtures: `test/fixtures/users.yml`

```yaml
alice:
  email_address: "alice@example.com"
  username: "alice"
  password_digest: <%= BCrypt::Password.create("password123") %>
```

- [ ] **Step 9: Run system tests**

```bash
bin/rails test test/system/auth_test.rb
```

Expected: Tests pass (may need view adjustments to match field labels).

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: add authentication with has_secure_password"
```

---

### Task 3: Topic Model & CRUD

**Files:**
- Create: `app/models/topic.rb`
- Create: `app/controllers/topics_controller.rb`
- Create: `app/views/topics/index.html.erb`, `show.html.erb`, `new.html.erb`, `edit.html.erb`
- Create: `db/migrate/*_create_topics.rb`
- Create: `test/models/topic_test.rb`, `test/controllers/topics_controller_test.rb`, `test/system/topics_test.rb`
- Create: `test/fixtures/topics.yml`
- Modify: `config/routes.rb`

- [ ] **Step 1: Write failing Topic model test**

File: `test/models/topic_test.rb`

```ruby
require "test_helper"

class TopicTest < ActiveSupport::TestCase
  test "valid topic" do
    topic = Topic.new(
      title: "Welcome to the Forum",
      user: users(:alice)
    )
    assert topic.valid?
  end

  test "requires title" do
    topic = Topic.new(user: users(:alice))
    assert_not topic.valid?
    assert_includes topic.errors[:title], "can't be blank"
  end

  test "title minimum length" do
    topic = Topic.new(title: "Hi", user: users(:alice))
    assert_not topic.valid?
    assert_includes topic.errors[:title], "is too short (minimum is 5 characters)"
  end

  test "generates slug from title on create" do
    topic = Topic.create!(title: "Hello World This Is Great", user: users(:alice))
    assert_equal "hello-world-this-is-great", topic.slug
  end

  test "slug is unique" do
    Topic.create!(title: "My Topic", user: users(:alice))
    duplicate = Topic.create(title: "My Topic", user: users(:alice))
    assert_not_equal "my-topic", duplicate.slug
    assert_match(/my-topic-/, duplicate.slug)
  end
end
```

- [ ] **Step 2: Run test, confirm failure**

```bash
bin/rails test test/models/topic_test.rb
```

Expected: FAIL — `NameError: uninitialized constant Topic`

- [ ] **Step 3: Create topics migration**

```bash
bin/rails generate migration CreateTopics title:string slug:string:uniq user:references
```

Edit migration:

```ruby
class CreateTopics < ActiveRecord::Migration[8.0]
  def change
    create_table :topics do |t|
      t.string :title, null: false
      t.string :slug, null: false
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
    add_index :topics, :slug, unique: true
  end
end
```

```bash
bin/rails db:migrate
```

- [ ] **Step 4: Create Topic model**

File: `app/models/topic.rb`

```ruby
class Topic < ApplicationRecord
  belongs_to :user
  has_many :posts, dependent: :destroy

  validates :title, presence: true, length: { minimum: 5, maximum: 200 }

  before_validation :set_slug, on: :create

  def to_param
    slug
  end

  private

  def set_slug
    base = title.to_s.parameterize
    candidate = base
    count = 1
    while self.class.exists?(slug: candidate)
      candidate = "#{base}-#{count}"
      count += 1
    end
    self.slug = candidate
  end
end
```

- [ ] **Step 5: Create fixtures**

File: `test/fixtures/topics.yml`

```yaml
one:
  title: "First Topic Ever"
  slug: "first-topic-ever"
  user: alice

two:
  title: "Another Discussion"
  slug: "another-discussion"
  user: alice
```

- [ ] **Step 6: Run model tests**

```bash
bin/rails test test/models/topic_test.rb
```

Expected: All model tests pass.

- [ ] **Step 7: Write TopicsController test**

File: `test/controllers/topics_controller_test.rb`

```ruby
require "test_helper"

class TopicsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)
    post session_path, params: { email_address: @user.email_address, password: "password123" }
  end

  test "should get index" do
    get topics_path
    assert_response :success
    assert_select "h1", "Topics"
  end

  test "should get new" do
    get new_topic_path
    assert_response :success
    assert_select "form"
  end

  test "should create topic" do
    assert_difference("Topic.count") do
      post topics_path, params: { topic: { title: "A Brand New Topic" } }
    end
    assert_redirected_to topic_path(Topic.last)
  end

  test "should show topic" do
    get topic_path(topics(:one))
    assert_response :success
    assert_select "h1", topics(:one).title
  end

  test "should get edit" do
    get edit_topic_path(topics(:one))
    assert_response :success
  end

  test "should update topic" do
    patch topic_path(topics(:one)), params: { topic: { title: "Updated Title Here" } }
    assert_redirected_to topic_path(topics(:one))
    topics(:one).reload
    assert_equal "Updated Title Here", topics(:one).title
  end

  test "should destroy topic" do
    assert_difference("Topic.count", -1) do
      delete topic_path(topics(:one))
    end
    assert_redirected_to topics_path
  end

  test "redirects to login when not authenticated" do
    delete session_path # sign out
    get topics_path
    assert_redirected_to new_session_path
  end
end
```

- [ ] **Step 8: Add routes**

Edit `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  root "home#index"

  resources :topics do
    resources :posts, only: [:create, :edit, :update, :destroy]
  end

  resource :registration, only: [:new, :create]
  resource :session, only: [:new, :create, :destroy]
  resources :passwords, only: [:new, :create, :edit, :update]
end
```

- [ ] **Step 9: Create TopicsController**

File: `app/controllers/topics_controller.rb`

```ruby
class TopicsController < ApplicationController
  before_action :set_topic, only: [:show, :edit, :update, :destroy]

  def index
    @topics = Topic.order(created_at: :desc)
  end

  def show
    @posts = @topic.posts.order(created_at: :asc)
    @post = @topic.posts.new
  end

  def new
    @topic = Topic.new
  end

  def create
    @topic = Current.user.topics.new(topic_params)
    if @topic.save
      redirect_to @topic, notice: "Topic created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @topic.update(topic_params)
      redirect_to @topic, notice: "Topic updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @topic.destroy
    redirect_to topics_path, notice: "Topic deleted."
  end

  private

  def set_topic
    @topic = Topic.find_by!(slug: params[:id])
  end

  def topic_params
    params.require(:topic).permit(:title)
  end
end
```

- [ ] **Step 10: Create Topic views**

File: `app/views/topics/index.html.erb`

```erb
<h1 class="text-2xl font-bold mb-4">Topics</h1>

<%= link_to "New Topic", new_topic_path, class: "inline-block bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700" %>

<div class="space-y-2">
  <% @topics.each do |topic| %>
    <div class="border rounded p-4 hover:bg-gray-50">
      <%= link_to topic.title, topic_path(topic), class: "text-lg font-semibold text-blue-600 hover:underline" %>
      <div class="text-sm text-gray-500 mt-1">
        by <%= topic.user.username %> &middot; <%= time_ago_in_words(topic.created_at) %> ago
      </div>
    </div>
  <% end %>
</div>
```

File: `app/views/topics/show.html.erb`

```erb
<div class="mb-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold"><%= @topic.title %></h1>
    <% if @topic.user == Current.user %>
      <div class="space-x-2">
        <%= link_to "Edit", edit_topic_path(@topic), class: "text-gray-600 hover:underline" %>
        <%= button_to "Delete", topic_path(@topic), method: :delete, class: "text-red-600 hover:underline",
            form: { data: { turbo_confirm: "Delete this topic?" } } %>
      </div>
    <% end %>
  </div>
  <div class="text-sm text-gray-500 mt-1">
    by <%= @topic.user.username %> &middot; <%= time_ago_in_words(@topic.created_at) %> ago
  </div>
</div>

<div class="border-t pt-4 mb-6">
  <% @posts.each do |post| %>
    <%= render "posts/post", post: post %>
  <% end %>
</div>

<% if Current.user %>
  <div class="border rounded p-4 bg-gray-50">
    <h2 class="font-semibold mb-2">Reply</h2>
    <%= render "posts/form", topic: @topic, post: @post %>
  </div>
<% else %>
  <p class="text-gray-500"><%= link_to "Sign in", new_session_path, class: "text-blue-600 underline" %> to reply.</p>
<% end %>
```

File: `app/views/topics/new.html.erb`

```erb
<h1 class="text-2xl font-bold mb-4">New Topic</h1>

<%= form_with model: @topic, class: "space-y-4 max-w-lg" do |f| %>
  <% if @topic.errors.any? %>
    <div class="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
      <ul>
        <% @topic.errors.full_messages.each do |msg| %>
          <li><%= msg %></li>
        <% end %>
      </ul>
    </div>
  <% end %>

  <div>
    <%= f.label :title, class: "block text-sm font-medium mb-1" %>
    <%= f.text_field :title, class: "w-full border rounded px-3 py-2", placeholder: "What do you want to discuss?" %>
  </div>

  <%= f.submit "Create Topic", class: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" %>
<% end %>
```

File: `app/views/topics/edit.html.erb`

```erb
<h1 class="text-2xl font-bold mb-4">Edit Topic</h1>

<%= form_with model: @topic, class: "space-y-4 max-w-lg" do |f| %>
  <% if @topic.errors.any? %>
    <div class="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
      <ul>
        <% @topic.errors.full_messages.each do |msg| %>
          <li><%= msg %></li>
        <% end %>
      </ul>
    </div>
  <% end %>

  <div>
    <%= f.label :title, class: "block text-sm font-medium mb-1" %>
    <%= f.text_field :title, class: "w-full border rounded px-3 py-2" %>
  </div>

  <%= f.submit "Update Topic", class: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" %>
<% end %>
```

- [ ] **Step 11: Run controller tests**

```bash
bin/rails test test/controllers/topics_controller_test.rb
```

Expected: All tests pass.

- [ ] **Step 12: Write system test for topics**

File: `test/system/topics_test.rb`

```ruby
require "application_system_test_case"

class TopicsTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    sign_in_as(@user)
  end

  test "creating a new topic" do
    visit topics_path
    click_link "New Topic"
    fill_in "Title", with: "My First Discussion Topic"
    click_button "Create Topic"

    assert_text "Topic created."
    assert_text "My First Discussion Topic"
  end

  test "listing topics" do
    visit topics_path
    assert_text "First Topic Ever"
    assert_text "Another Discussion"
  end

  test "editing own topic" do
    topic = topics(:one)
    visit topic_path(topic)
    click_link "Edit"
    fill_in "Title", with: "Updated Title For Testing"
    click_button "Update Topic"

    assert_text "Topic updated."
    assert_text "Updated Title For Testing"
  end

  test "deleting own topic" do
    topic = topics(:one)
    visit topic_path(topic)
    accept_confirm { click_button "Delete" }

    assert_text "Topic deleted."
    assert_no_text topic.title
  end
end
```

Add helper to `test/application_system_test_case.rb`:

```ruby
require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [1400, 800]

  def sign_in_as(user)
    visit new_session_path
    fill_in "Email address", with: user.email_address
    fill_in "Password", with: "password123"
    click_button "Sign in"
  end
end
```

- [ ] **Step 13: Run system tests**

```bash
bin/rails test test/system/topics_test.rb
```

Expected: All system tests pass.

- [ ] **Step 14: Commit**

```bash
git add .
git commit -m "feat: add Topic model with CRUD, slug-based URLs"
```

---

### Task 4: Post Model & CRUD

**Files:**
- Create: `app/models/post.rb`
- Create: `app/controllers/posts_controller.rb`
- Create: `app/views/posts/_post.html.erb`, `_form.html.erb`, `edit.html.erb`
- Create: `db/migrate/*_create_posts.rb`
- Create: `test/models/post_test.rb`, `test/controllers/posts_controller_test.rb`, `test/system/posts_test.rb`
- Create: `test/fixtures/posts.yml`

- [ ] **Step 1: Write failing Post model test**

File: `test/models/post_test.rb`

```ruby
require "test_helper"

class PostTest < ActiveSupport::TestCase
  test "valid post" do
    post = Post.new(
      body: "This is a reply to the topic.",
      topic: topics(:one),
      user: users(:alice)
    )
    assert post.valid?
  end

  test "requires body" do
    post = Post.new(topic: topics(:one), user: users(:alice))
    assert_not post.valid?
    assert_includes post.errors[:body], "can't be blank"
  end

  test "requires topic" do
    post = Post.new(body: "Hello", user: users(:alice))
    assert_not post.valid?
    assert_includes post.errors[:topic], "must exist"
  end

  test "requires user" do
    post = Post.new(body: "Hello", topic: topics(:one))
    assert_not post.valid?
    assert_includes post.errors[:user], "must exist"
  end
end
```

- [ ] **Step 2: Run test, confirm failure**

```bash
bin/rails test test/models/post_test.rb
```

Expected: FAIL — `NameError: uninitialized constant Post`

- [ ] **Step 3: Create posts migration**

```bash
bin/rails generate migration CreatePosts topic:references user:references parent:references body:text
```

Edit migration:

```ruby
class CreatePosts < ActiveRecord::Migration[8.0]
  def change
    create_table :posts do |t|
      t.references :topic, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :parent, foreign_key: { to_table: :posts }, null: true
      t.text :body, null: false

      t.timestamps
    end
    add_index :posts, [:topic_id, :created_at]
  end
end
```

```bash
bin/rails db:migrate
```

- [ ] **Step 4: Create Post model**

File: `app/models/post.rb`

```ruby
class Post < ApplicationRecord
  belongs_to :topic, touch: true
  belongs_to :user
  belongs_to :parent, class_name: "Post", optional: true
  has_many :replies, class_name: "Post", foreign_key: :parent_id, dependent: :nullify

  validates :body, presence: true, length: { minimum: 2, maximum: 10000 }
end
```

- [ ] **Step 5: Update User model**

Edit `app/models/user.rb`, add:

```ruby
has_many :posts, dependent: :destroy
```

- [ ] **Step 6: Create fixtures**

File: `test/fixtures/posts.yml`

```yaml
one:
  topic: one
  user: alice
  body: "This is the first reply. Welcome!"

two:
  topic: one
  user: alice
  body: "A follow-up thought."
  parent: one
```

- [ ] **Step 7: Run model tests**

```bash
bin/rails test test/models/post_test.rb
```

Expected: All model tests pass.

- [ ] **Step 8: Write PostsController test**

File: `test/controllers/posts_controller_test.rb`

```ruby
require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)
    @topic = topics(:one)
    post session_path, params: { email_address: @user.email_address, password: "password123" }
  end

  test "should create post" do
    assert_difference("Post.count") do
      post topic_posts_path(@topic), params: { post: { body: "This is a new reply." } }
    end
    assert_redirected_to topic_path(@topic)
  end

  test "should get edit" do
    get edit_topic_post_path(@topic, posts(:one))
    assert_response :success
  end

  test "should update post" do
    patch topic_post_path(@topic, posts(:one)), params: { post: { body: "Updated reply content." } }
    assert_redirected_to topic_path(@topic)
    posts(:one).reload
    assert_equal "Updated reply content.", posts(:one).body
  end

  test "should destroy post" do
    assert_difference("Post.count", -1) do
      delete topic_post_path(@topic, posts(:one))
    end
    assert_redirected_to topic_path(@topic)
  end

  test "redirects to login when not authenticated" do
    delete session_path
    post topic_posts_path(@topic), params: { post: { body: "Test" } }
    assert_redirected_to new_session_path
  end
end
```

- [ ] **Step 9: Create PostsController**

File: `app/controllers/posts_controller.rb`

```ruby
class PostsController < ApplicationController
  before_action :set_topic
  before_action :set_post, only: [:edit, :update, :destroy]

  def create
    @post = @topic.posts.new(post_params)
    @post.user = Current.user

    if @post.save
      redirect_to @topic, notice: "Reply posted."
    else
      @posts = @topic.posts.order(created_at: :asc)
      render "topics/show", status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @post.update(post_params)
      redirect_to @topic, notice: "Reply updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @post.destroy
    redirect_to @topic, notice: "Reply deleted."
  end

  private

  def set_topic
    @topic = Topic.find_by!(slug: params[:topic_id])
  end

  def set_post
    @post = @topic.posts.find(params[:id])
  end

  def post_params
    params.require(:post).permit(:body)
  end
end
```

- [ ] **Step 10: Create Post views**

File: `app/views/posts/_post.html.erb`

```erb
<div id="<%= dom_id(post) %>" class="border rounded p-4 mb-3 <%= "ml-8 bg-gray-50" if post.parent_id %>">
  <div class="flex items-center justify-between mb-2">
    <div class="text-sm">
      <span class="font-semibold"><%= post.user.username %></span>
      <span class="text-gray-500">&middot; <%= time_ago_in_words(post.created_at) %> ago</span>
      <% if post.parent %>
        <span class="text-gray-400"> &middot; replying to <%= post.parent.user.username %></span>
      <% end %>
    </div>
    <% if post.user == Current.user %>
      <div class="space-x-2 text-sm">
        <%= link_to "Edit", edit_topic_post_path(post.topic, post), class: "text-gray-600 hover:underline" %>
        <%= button_to "Delete", topic_post_path(post.topic, post), method: :delete, class: "text-red-600 hover:underline",
            form: { data: { turbo_confirm: "Delete this reply?" } } %>
      </div>
    <% end %>
  </div>
  <div class="prose max-w-none">
    <%= markdown(post.body) %>
  </div>
</div>
```

File: `app/views/posts/_form.html.erb`

```erb
<%= form_with model: [topic, post], class: "space-y-3" do |f| %>
  <% if post.errors.any? %>
    <div class="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
      <ul>
        <% post.errors.full_messages.each do |msg| %>
          <li><%= msg %></li>
        <% end %>
      </ul>
    </div>
  <% end %>

  <div>
    <%= f.text_area :body, rows: 4, class: "w-full border rounded px-3 py-2",
        placeholder: "Write your reply... (Markdown supported)" %>
  </div>

  <%= f.submit post.persisted? ? "Update Reply" : "Post Reply",
      class: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" %>
<% end %>
```

File: `app/views/posts/edit.html.erb`

```erb
<h1 class="text-2xl font-bold mb-4">Edit Reply</h1>

<%= render "form", topic: @topic, post: @post %>

<div class="mt-4">
  <%= link_to "Back to topic", topic_path(@topic), class: "text-blue-600 hover:underline" %>
</div>
```

- [ ] **Step 11: Run controller tests**

```bash
bin/rails test test/controllers/posts_controller_test.rb
```

Expected: All tests pass.

- [ ] **Step 12: Write system test for posts**

File: `test/system/posts_test.rb`

```ruby
require "application_system_test_case"

class PostsTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    sign_in_as(@user)
  end

  test "replying to a topic" do
    topic = topics(:one)
    visit topic_path(topic)
    fill_in "Write your reply...", with: "Great topic! Here is my reply."
    click_button "Post Reply"

    assert_text "Reply posted."
    assert_text "Great topic! Here is my reply."
  end

  test "editing a post" do
    post_record = posts(:one)
    visit topic_path(post_record.topic)

    within("##{ActionView::RecordIdentifier.dom_id(post_record)}") do
      click_link "Edit"
    end

    fill_in "body", with: "Updated reply content."
    click_button "Update Reply"

    assert_text "Reply updated."
    assert_text "Updated reply content."
  end

  test "deleting a post" do
    post_record = posts(:one)
    visit topic_path(post_record.topic)

    within("##{ActionView::RecordIdentifier.dom_id(post_record)}") do
      accept_confirm { click_button "Delete" }
    end

    assert_text "Reply deleted."
    assert_no_text post_record.body
  end
end
```

- [ ] **Step 13: Run system tests**

```bash
bin/rails test test/system/posts_test.rb
```

Expected: All system tests pass.

- [ ] **Step 14: Commit**

```bash
git add .
git commit -m "feat: add Post model with nested CRUD under topics"
```

---

### Task 5: Markdown Rendering

**Files:**
- Create: `app/helpers/markdown_helper.rb`
- Modify: `Gemfile`

- [ ] **Step 1: Add Redcarpet gem**

Edit `Gemfile`, add:

```ruby
gem "redcarpet", "~> 3.6"
```

```bash
bundle install
```

- [ ] **Step 2: Create Markdown helper**

File: `app/helpers/markdown_helper.rb`

```ruby
module MarkdownHelper
  def markdown(text)
    return "" if text.blank?

    renderer = Redcarpet::Render::HTML.new(
      hard_wrap: true,
      filter_html: true,
      link_attributes: { rel: "nofollow", target: "_blank" }
    )

    Redcarpet::Markdown.new(renderer, {
      autolink: true,
      strikethrough: true,
      no_intra_emphasis: true,
      fenced_code_blocks: true,
      tables: true
    }).render(text).html_safe
  end
end
```

- [ ] **Step 3: Write helper test**

File: `test/helpers/markdown_helper_test.rb`

```ruby
require "test_helper"

class MarkdownHelperTest < ActionView::TestCase
  test "renders bold text" do
    result = markdown("**bold**")
    assert_includes result, "<strong>bold</strong>"
  end

  test "renders links with nofollow" do
    result = markdown("[click](https://example.com)")
    assert_includes result, 'rel="nofollow"'
    assert_includes result, 'target="_blank"'
  end

  test "renders code blocks" do
    result = markdown("```ruby\nputs 'hi'\n```")
    assert_includes result, "<code>"
  end

  test "handles blank input" do
    assert_equal "", markdown("")
    assert_equal "", markdown(nil)
  end

  test "escapes raw HTML" do
    result = markdown("<script>alert('xss')</script>")
    assert_not_includes result, "<script>"
  end
end
```

- [ ] **Step 4: Run test**

```bash
bin/rails test test/helpers/markdown_helper_test.rb
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Markdown rendering with Redcarpet and XSS protection"
```

---

### Task 6: Homepage & Layout

**Files:**
- Create: `app/controllers/home_controller.rb`
- Create: `app/views/home/index.html.erb`
- Modify: `app/views/layouts/application.html.erb`

- [ ] **Step 1: Create HomeController**

File: `app/controllers/home_controller.rb`

```ruby
class HomeController < ApplicationController
  def index
    @recent_topics = Topic.order(created_at: :desc).limit(20)
  end
end
```

- [ ] **Step 2: Create homepage view**

File: `app/views/home/index.html.erb`

```erb
<div class="max-w-3xl mx-auto">
  <div class="text-center py-12">
    <h1 class="text-4xl font-bold mb-4">Forum</h1>
    <p class="text-gray-600 text-lg mb-6">A place for thoughtful discussion.</p>
    <% unless Current.user %>
      <div class="space-x-4">
        <%= link_to "Sign Up", new_registration_path, class: "bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700" %>
        <%= link_to "Sign In", new_session_path, class: "border border-blue-600 text-blue-600 px-6 py-2 rounded hover:bg-blue-50" %>
      </div>
    <% end %>
  </div>

  <h2 class="text-xl font-semibold mb-4">Recent Discussions</h2>

  <div class="space-y-3">
    <% @recent_topics.each do |topic| %>
      <div class="border rounded p-4 hover:bg-gray-50">
        <%= link_to topic.title, topic_path(topic), class: "text-lg font-semibold text-blue-600 hover:underline" %>
        <div class="text-sm text-gray-500 mt-1">
          by <%= topic.user.username %> &middot; <%= time_ago_in_words(topic.created_at) %> ago
          &middot; <%= pluralize(topic.posts.count, "reply") %>
        </div>
      </div>
    <% end %>

    <% if @recent_topics.empty? %>
      <p class="text-gray-500 text-center py-8">No topics yet. Be the first to start a discussion!</p>
    <% end %>
  </div>
</div>
```

- [ ] **Step 3: Update layout with nav**

Edit `app/views/layouts/application.html.erb`:

```erb
<!DOCTYPE html>
<html>
  <head>
    <title><%= content_for(:title) || "Forum" %></title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <%= csrf_meta_tags %>
    <%= csp_meta_tag %>
    <%= stylesheet_link_tag "tailwind", "inter-font", "data-turbo-track": "reload" %>
    <%= javascript_importmap_tags %>
  </head>
  <body class="min-h-screen bg-white">
    <nav class="border-b bg-white sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <%= link_to "Forum", root_path, class: "text-xl font-bold text-blue-600" %>
        <div class="flex items-center space-x-4 text-sm">
          <%= link_to "Topics", topics_path, class: "hover:text-blue-600" %>
          <% if Current.user %>
            <span class="text-gray-600"><%= Current.user.username %></span>
            <%= button_to "Sign Out", session_path, method: :delete, class: "text-red-600 hover:underline" %>
          <% else %>
            <%= link_to "Sign In", new_session_path, class: "hover:text-blue-600" %>
          <% end %>
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <% if notice.present? %>
        <div class="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"><%= notice %></div>
      <% end %>
      <% if alert.present? %>
        <div class="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"><%= alert %></div>
      <% end %>
      <%= yield %>
    </main>
  </body>
</html>
```

- [ ] **Step 4: Run full test suite**

```bash
bin/rails test
bin/rails test:system
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add homepage, nav layout, flash messages"
```

---

### Task 7: Seed Data

**Files:**
- Modify: `db/seeds.rb`

- [ ] **Step 1: Write seeds**

File: `db/seeds.rb`

```ruby
puts "Seeding..."

# Create demo user if not exists
demo = User.find_or_create_by!(email_address: "demo@example.com") do |u|
  u.username = "demo"
  u.password = "password123"
end

puts "  Demo user: demo@example.com / password123"

# Create topics with posts
5.times do |i|
  topic = Topic.create!(
    title: "Sample Discussion ##{i + 1}",
    user: demo
  )

  # First post by topic author
  Post.create!(
    topic: topic,
    user: demo,
    body: "Welcome to **Sample Discussion ##{i + 1}**!\n\nThis is the first post. Feel free to reply with your thoughts."
  )

  # Some reply posts
  3.times do |j|
    Post.create!(
      topic: topic,
      user: demo,
      body: "Reply #{j + 1}: This is an example reply in the thread. Markdown is supported — try **bold**, *italic*, or `inline code`."
    )
  end
end

puts "  Created #{Topic.count} topics with #{Post.count} posts"
puts "Done."
```

- [ ] **Step 2: Run seeds**

```bash
bin/rails db:seed
```

Expected: Creates demo user, 5 topics, 20 posts. No errors.

- [ ] **Step 3: Verify seeds visually**

```bash
bin/rails server
```

Visit `http://localhost:3000`. Should see 5 topics with reply counts.

- [ ] **Step 4: Commit**

```bash
git add db/seeds.rb
git commit -m "feat: add seed data with demo user and sample topics"
```

---

### Task 8: Full Test Suite & Coverage

**Files:**
- Modify: `Gemfile` (add simplecov)
- Modify: `test/test_helper.rb`

- [ ] **Step 1: Add SimpleCov**

Edit `Gemfile`, add in test group:

```ruby
gem "simplecov", require: false
```

```bash
bundle install
```

- [ ] **Step 2: Configure SimpleCov**

Edit `test/test_helper.rb`, add at very top:

```ruby
require "simplecov"
SimpleCov.start "rails" do
  minimum_coverage 80
  add_filter "/test/"
  add_filter "/config/"
  add_filter "/vendor/"
end
```

- [ ] **Step 3: Run full suite with coverage**

```bash
bin/rails test
bin/rails test:system
```

Expected: All tests pass. Coverage >= 80%.

Check: `open coverage/index.html`

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: add test coverage with SimpleCov"
```

---

### Task 9: GitHub CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write CI workflow**

File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      chrome:
        image: browserless/chrome:latest
        ports: ["3000:3000"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: .ruby-version
          bundler-cache: true

      - name: Install dependencies
        run: bundle install

      - name: Setup database
        run: bin/rails db:create db:migrate

      - name: Run tests
        run: bin/rails test

      - name: Run system tests
        run: bin/rails test:system
        env:
          RAILS_ENV: test
          SELENIUM_REMOTE_URL: http://localhost:3000/webdriver

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: .ruby-version
          bundler-cache: true

      - name: Run Standard lint
        run: |
          gem install standard
          standardrb

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: .ruby-version
          bundler-cache: true

      - name: Run Brakeman
        run: |
          gem install brakeman
          brakeman --no-pager
```

- [ ] **Step 2: Add Standard gem for linting**

Edit `Gemfile`, add:

```ruby
gem "standard", group: [:development, :test]
```

```bash
bundle install
```

- [ ] **Step 3: Run linter, auto-fix**

```bash
bundle exec standardrb --fix
```

- [ ] **Step 4: Run Brakeman locally**

```bash
bundle exec brakeman --no-pager
```

Expected: 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "ci: add GitHub CI with tests, Standard lint, and Brakeman"
```

---

### Task 10: Kamal Deploy Configuration

**Files:**
- Create: `config/deploy.yml`

- [ ] **Step 1: Write deploy config**

File: `config/deploy.yml`

```yaml
service: forum

image: <%= ENV["DOCKER_USERNAME"] %>/forum

servers:
  web:
    hosts:
      - <%= ENV["VPS_IP"] %>
    labels:
      traefik.http.routers.forum.rule: Host(`<%= ENV["DOMAIN"] %>`)
      traefik.http.routers.forum.tls: true
      traefik.http.routers.forum.tls.certresolver: letsencrypt
    options:
      memory: 512m
      cpus: "1.0"

registry:
  username: <%= ENV["DOCKER_USERNAME"] %>
  password: <%= ENV["DOCKER_PASSWORD"] %>

env:
  clear:
    RAILS_ENV: production
    RAILS_SERVE_STATIC_FILES: true
    RAILS_LOG_TO_STDOUT: true
  secret:
    - RAILS_MASTER_KEY
    - SECRET_KEY_BASE

accessories:
  solid_queue:
    image: <%= ENV["DOCKER_USERNAME"] %>/forum
    cmd: bin/jobs
    env:
      clear:
        RAILS_ENV: production
      secret:
        - RAILS_MASTER_KEY

traefik:
  args:
    entrypoints.web.address: ":80"
    entrypoints.web.http.redirections.entrypoint.to: websecure
    entrypoints.web.http.redirections.entrypoint.scheme: https
    entrypoints.websecure.address: ":443"
    certificatesResolvers.letsencrypt.acme.email: "<%= ENV['LETSENCRYPT_EMAIL'] %>"
    certificatesResolvers.letsencrypt.acme.storage: /letsencrypt/acme.json
    certificatesResolvers.letsencrypt.acme.httpchallenge.entrypoint: web
```

- [ ] **Step 2: Set up Kamal**

```bash
bundle exec kamal init
```

This creates/confirms `config/deploy.yml` and adds `.env` template.

- [ ] **Step 3: Add required env vars to `.env`**

Create `.env` (never commit):

```bash
VPS_IP=your.vps.ip
DOMAIN=forum.yourdomain.com
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password
LETSENCRYPT_EMAIL=you@example.com
```

Add `.env` to `.gitignore`:

```bash
echo ".env" >> .gitignore
```

- [ ] **Step 4: Set up VPS prerequisites**

SSH into VPS and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Traefik via Kamal
# (Kamal handles this on first deploy)
```

- [ ] **Step 5: Deploy**

```bash
bundle exec kamal setup
bundle exec kamal deploy
```

- [ ] **Step 6: Verify deployment**

```bash
curl -I https://forum.yourdomain.com
```

Expected: HTTP 200, SSL certificate valid.

- [ ] **Step 7: Commit deploy config**

```bash
git add config/deploy.yml .gitignore
git commit -m "feat: add Kamal deploy configuration"
```

---

### Task 11: Final Integration Check

- [ ] **Step 1: Run full test suite**

```bash
bin/rails test
bin/rails test:system
```

Expected: All tests green. Coverage >= 80%.

- [ ] **Step 2: Run Brakeman**

```bash
bundle exec brakeman --no-pager
```

Expected: 0 warnings.

- [ ] **Step 3: Run linter**

```bash
bundle exec standardrb
```

Expected: 0 offenses.

- [ ] **Step 4: Manual smoke test**

```bash
bin/rails server
```

Checklist:
- [ ] Visit homepage — shows recent topics (or empty state)
- [ ] Sign up a new user
- [ ] Sign out, sign back in
- [ ] Create a new topic
- [ ] Reply to the topic
- [ ] Edit the reply
- [ ] Delete a reply
- [ ] Visit `/topics` — all topics listed
- [ ] Verify Markdown rendering (bold, links, code blocks)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: final integration check, all tests green"
```

---

## Summary

**Total tasks:** 11 | **Estimated commits:** 11

**Deliverables after Phase 1:**
- Rails 8 app with Tailwind CSS
- User registration, sign in, sign out (has_secure_password)
- Topic CRUD with slug-based URLs
- Post CRUD nested under topics
- Markdown rendering with XSS protection
- Seed data for local development
- Test suite with >= 80% coverage (models, controllers, system)
- GitHub CI: tests, linting, security
- Kamal deploy to VPS with SSL
