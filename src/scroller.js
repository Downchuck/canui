// $Id$

namespace("ui", {

// todo: horizontal not done
//
// up/down buttons on the scrollbar; this will fire tick() once when
// the user clicks the button or continuously at intervals if the
// button is held down
//
scroll_button: function(opts)
{
  ui.inherit_clickable(this, opts);
  var self = this;

  // fired then the button is clicked or held down
  this.tick = new signal();

  // icon on the button
  var image_ = undefined;

  // fires repeatedly when the button is held down
  var ticker_ = new delayed_ticker(
    ui.system_options.scroll_delay,
    ui.system_options.scroll_tick_delay);


  // constructor; loads the image
  //
  var init = function()
  {
    self.set_default_options({
      caption: "",
      image: undefined
    });

    assert(self.option("image") != undefined);
    
    // todo: path is hardcoded
    // once the image is loaded, set it on the button
    self.label(new ui.image({image: load_image(
      image_dir() + "/" + self.option("image"),
      self.option("caption"))}));

    self.clicked.add(on_tick);
  };

  // starts the tick timer
  //
  self.on_mouse_left_down = function(mp)
  {
    self.clickable__on_mouse_left_down(mp);
    ticker_.start(on_tick);
  };

  // stops the tick timer
  //
  self.on_mouse_left_up = function(mp)
  {
    self.clickable__on_mouse_left_up(mp);
    ticker_.stop();
  };

  // temporarily stops the tick timer
  //
  self.on_mouse_leave = function()
  {
    self.clickable__on_mouse_leave();

    if (self.pressed())
      ticker_.stop();
  }

  // resumes the tick timer
  //
  self.on_mouse_enter = function(mp)
  {
    self.clickable__on_mouse_enter(mp);

    if (self.pressed())
      ticker_.start(on_tick);
  }

  // fires tick()
  //
  var on_tick = function(v)
  {
    self.tick.fire();
  };

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "scroll_button";
  }

  init();
},

// contains two buttons for up/down-left/right and a slider control
// todo: doesn't support horizontal, doesn't support standalone,
// currently used only by scroller
//
scrollbar: function(opts)
{
  ui.inherit_container(this,
    merge(opts, {layout: new ui.border_layout()}));
  var self = this;

  // fired when the scroll position changed; receives the current
  // value
  self.changed = new signal();

  
  // up/left button
  var up_ = new ui.scroll_button({image: "up.png", caption: "^"});

  // down/right button
  var down_ = new ui.scroll_button({image: "down.png", caption: "v"});

  // slider
  var thumb_ = new ui.slider({orientation: "vertical", proportional: true});

  // width/height of a scroll button (todo: put this elsewhere)
  var button_size_ = 17;

  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      tick_size: 1});

    self.add(up_, ui.sides.top);
    self.add(thumb_, ui.sides.center);
    self.add(down_, ui.sides.bottom);

    thumb_.borders({all: 0});
    thumb_.changed.add(on_thumb_moved);

    up_.tick.add(on_up);
    down_.tick.add(on_down);
  };

  // sets the scroll amount when the buttons are clicked
  //
  self.tick_size = function(v)
  {
    self.option("tick_size", v);
    //thumb_.tick_size(v);
  }

  // sets the scroll amount when the slider is paged
  //
  self.page_size = function(v)
  {
    thumb_.page_size(v);
  }

  // returns the width/height of the button
  //
  self.best_dimension = function()
  {
    return new dimension(button_size_, 0);
  }

  // sets the limits of the scrollbar (forwarded to the slider)
  //
  self.limits = function(min, max)
  {
    thumb_.limits(min, max);
  }

  // scrolls by the given amount
  //
  self.scroll_by = function(d)
  {
    thumb_.value(thumb_.value() + d);
  }

  // either a click on the up button or that button is held down
  //
  var on_up = function()
  {
    thumb_.value(thumb_.value() - self.option("tick_size"));
  };

  // either a click on the down button or that button is held down
  //
  var on_down = function()
  {
    thumb_.value(thumb_.value() + self.option("tick_size"));
  };

  // slider was moved (either by the user or by the up/down buttons),
  // fire changed()
  //
  var on_thumb_moved = function(v)
  {
    self.changed.fire(v);
  };

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "scrollbar";
  };

  init();
},

// contains one child that always has its best dimension and is moved
// around while scrolling
//
// todo: this overrides some member functions so that children are
// added/removed from the internal panel, but some are missing
//
// todo: can't this use a border_layout instead of moving the
// children around? the child is already in the internal panel, which
// is an absolute layout
//
scroller: function(opts)
{
  ui.inherit_container(this,
    merge(opts, {layout: new ui.absolute_layout()}));
  var self = this;

  // this will contain the full size child
  var panel_ = new ui.panel(new ui.absolute_layout());

  // scroll bar
  var bar_ = new ui.scrollbar();

  // current offset of the child (todo: why can't the child
  // coordinates be used instead?)
  var origin_ = new point(0, 0);


  // constructor
  //
  var init = function()
  {
    // events will go through to the child
    self.transparent(true);
    panel_.transparent(true);
    
    self.container__add(panel_);
    self.container__add(bar_);

    bar_.changed.add(on_scrolled);
  };

  // sets the limits of the scroll (forwarded to the scroll bar)
  //
  self.limits = function(min, max)
  {
    bar_.limits(min, max);
  }

  // sets the size of a tick (forwarded to the scroll bar)
  //
  self.tick_size = function(v)
  {
    bar_.tick_size(v);
  }

  // overriden so that children are added to the internal panel
  //
  self.add = function(c, w)
  {
    assert(panel_.children_count() == 0);
    return panel_.add(c, ui.sides.center);
  }

  // overriden so that children are removed from the internal panel
  //
  self.remove = function(c)
  {
    return panel_.remove(c);
  }

  // overriden so that children are removed from the internal panel
  //
  self.remove_all = function()
  {
    return panel_.remove_all();
  }

  // called when the scrollbar has been moved
  //
  var on_scrolled = function(v)
  {
    self.scroll(0, v);
  }

  // scrolls to the given point in pixels (todo: clamp it)
  //
  self.scroll = function(x, y)
  {
    origin_.x = -x;
    origin_.y = -y;

    var bd = child().best_dimension();

    // moves the child to the scroll offset
    child().bounds(new rectangle(
      origin_.x, origin_.y, child().width(), child().height()));

    // todo: why? size hasn't changed
    panel_.do_layout();
  }

  // returns the number of pixels that exceed the scroller's size
  //
  var excess = function()
  {
    return new dimension(
      child().width() - panel_.width(),
      child().height() - panel_.height());
  }

  // returns the child controlled by the scroller
  //
  var child = function()
  {
    assert(panel_.children_count() > 0);
    return panel_.children()[0];
  }

  // moves the scrollbar and resizes the child so it always have at
  // least the scroller's size
  //
  self.on_bounds_changed = function()
  {
    // preferred width of the scrollbar
    var bw = bar_.best_dimension().w;

    // moving the scroll to the side
    bar_.bounds(new rectangle(
      self.width() - bw, 0, bw, self.height()));
    bar_.do_layout();
    
    if (self.children_count() != 0)
    {
      // resizing the internal panel so that it takes all the
      // remaining space
      panel_.bounds(new rectangle(
        0, 0, self.width() - bw, self.height()));

      // makes sure the child is never smaller than the scroller
      var bd = child().best_dimension();
      var w = Math.max(bd.w, panel_.width());
      var h = Math.max(bd.h, panel_.height());

      child().bounds(new rectangle(origin_.x, origin_.y, w, h));
      panel_.do_layout();

      bar_.limits(0, excess().h);
    }
  }

  // this is the child's dimension
  //
  self.best_dimension = function()
  {
    if (self.children_count() == 0)
      return new dimension(0, 0);
    return child.best_dimension();
  }

  // the bounds of the space in the scroller that is reserved for
  // the child (excludes the scrollbar)
  //
  self.usable_bounds = function()
  {
    return panel_.bounds();
  }
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "scroller";
  };

  init();
}

});   // namespace ui
