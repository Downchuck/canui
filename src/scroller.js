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
  ui.inherit_button(this, opts);
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
      self.option("image"), self.option("caption"))}));

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

  // fired when the limits have changed
  self.limits_changed = new signal();


  // up/left button
  var up_ = undefined;

  // down/right button
  var down_ = undefined;

  // slider
  var thumb_ = undefined;

  // width/height of a scroll button (todo: put this elsewhere)
  var button_size_ = 17;


  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      tick_size: 1,
      orientation: "vertical"
    });

    if (self.option("orientation") == "vertical")
    {
      up_ = new ui.scroll_button({image: "up.png", caption: "^"});
      down_ = new ui.scroll_button({image: "down.png", caption: "v"});
      thumb_ = new ui.slider({orientation: "vertical", proportional: true});

      self.add(up_, ui.sides.top);
      self.add(thumb_, ui.sides.center);
      self.add(down_, ui.sides.bottom);
    }
    else
    {
      up_ = new ui.scroll_button({image: "left.png", caption: "<"});
      down_ = new ui.scroll_button({image: "right.png", caption: ">"});
      thumb_ = new ui.slider({orientation: "horizontal", proportional: true});
      
      self.add(up_, ui.sides.left);
      self.add(thumb_, ui.sides.center);
      self.add(down_, ui.sides.right);
    }

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
    if (self.option("orientation") == "vertical")
      return new dimension(button_size_, 0);
    else
      return new dimension(0, button_size_);
  }

  // if min and max are undefined, sets the limits of the scrollbar
  // (forwarded to the slider); in any case returns the current limits
  // with an object {min: v, max: v}
  //
  self.limits = function(min, max)
  {
    if (min != undefined && max != undefined)
    {
      var r = thumb_.limits(Math.min(min, max), Math.max(min, max));

      if ((thumb_.limits().max - thumb_.limits().min) > 0)
      {
        up_.enabled(true);
        down_.enabled(true);
      }
      else
      {
        up_.enabled(false);
        down_.enabled(false);
      }

      self.limits_changed.fire();

      return r;
    }

    return thumb_.limits();
  }

  // scrolls by the given amount
  //
  self.scroll_by = function(d)
  {
    thumb_.value(thumb_.value() + d);
  }

  // scrolls to the given position
  //
  self.scroll_to = function(p)
  {
    thumb_.value(p);
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
// when the 'empty' option is set, the child controls are not
// monitored and scrolling will do nothing by itself except fire the
// handlers. This is used for controls that need scrollbars but have a
// more complex behaviour than merely moving a child control around
// (such as a list). Users should not normally add controls to the
// scroller, although it does no harm.
//
// todo: this overrides some member functions so that children are
// added/removed from the internal panel, but some are missing
//
// todo: can't this use a border_layout instead of moving the
// children around? the child is already in the internal panel, which
// is an absolute layout
//
// options
//   hbar (never, always, auto), default: auto
//     never: never shows the horizontal scrollbar, even if needed
//     always: always shows the horizontal scrollbar
//     auto: shows the horizontal scrollbar if needed
//
//  vbar (never, always, auto), default: auto
//    see hbar
//
//  empty (true/false), default: false
//    in this mode, the scroller does not monitor its child and needs
//    to be set manually, although it will still fire its events
//
scroller: function(opts)
{
  ui.inherit_container(this,
    merge(opts, {layout: new ui.absolute_layout()}));
  var self = this;

  self.hscroll = new signal();
  self.vscroll = new signal();


  // this will contain the full size child
  var panel_ = new ui.panel({layout: new ui.absolute_layout()});

  // scroll bars
  var vbar_ = new ui.scrollbar({orientation: "vertical"});
  var hbar_ = new ui.scrollbar({orientation: "horizontal"});

  // current offset of the child (todo: why can't the child
  // coordinates be used instead?)
  var origin_ = new point(0, 0);


  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      hbar: "auto",
      vbar: "auto",
      empty: false
    });

    // events will go through to the child
    self.transparent(true);
    panel_.transparent(true);

    panel_.option("background", new color().transparent());

    self.container__add(panel_);
    self.container__add(vbar_);
    self.container__add(hbar_);

    if (self.option("empty"))
    {
      vbar_.limits(0, 0);
      hbar_.limits(0, 0);
    }

    if (self.option("vbar") != "always")
      vbar_.visible(false);

    if (self.option("hbar") != "always")
      hbar_.visible(false);

    vbar_.changed.add(on_vscrolled);
    vbar_.limits_changed.add(on_vbar_limits);

    hbar_.changed.add(on_hscrolled);
    hbar_.limits_changed.add(on_hbar_limits);
  };

  // returns the vertical scrollbar
  //
  self.vbar = function()
  {
    return vbar_;
  }

  // returns the horizontal scrollbar
  //
  self.hbar = function()
  {
    return hbar_;
  }

  // overriden so that children are added to the internal panel
  //
  self.add = function(c, w)
  {
    if (self.option("empty"))
    {
      return self.container__add(c, w);
    }
    else
    {
      assert(panel_.children_count() == 0);
      return panel_.add(c, ui.sides.center);
    }
  }

  // overriden so that children are removed from the internal panel
  //
  self.remove = function(c)
  {
    if (self.option("empty"))
      return self.container__remove(c);
    else
      return panel_.remove(c);
  }

  // overriden so that children are removed from the internal panel
  //
  self.remove_all = function()
  {
    if (self.option("empty"))
      return self.container__remove_all();
    else
      return panel_.remove_all();
  }

  // called when the scrollbar has been moved
  //
  var on_hscrolled = function(v)
  {
    self.scroll_to(v, -origin_.y);
  }

  // called when the scrollbar has been moved
  //
  var on_vscrolled = function(v)
  {
    self.scroll_to(-origin_.x, v);
  }

  // called when the scrollbar has been moved
  //
  var on_hbar_limits = function()
  {
    self.do_layout();
  }

  // called when the scrollbar limits have changed
  //
  var on_vbar_limits = function()
  {
    self.do_layout();
  }

  // scrolls by the given amount
  //
  self.scroll_by = function(x, y)
  {
    self.scroll_to(-origin_.x + x, -origin_.y + y);
  };

  // scrolls to the given point
  //
  self.scroll_to = function(x, y)
  {
    x = clamp(x, hbar_.limits().min, hbar_.limits().max);
    y = clamp(y, vbar_.limits().min, vbar_.limits().max);

    if (-x != origin_.x)
    {
      hbar_.scroll_to(x);
      self.hscroll.fire(x);
    }

    if (-y != origin_.y)
    {
      vbar_.scroll_to(y);
      self.vscroll.fire(y);
    }

    origin_.x = -x;
    origin_.y = -y;

    if (!self.option("empty"))
    {
      var bd = child().best_dimension();

      // moves the child to the scroll offset
      child().bounds(new rectangle(
        origin_.x, origin_.y, child().width(), child().height()));
    }
  }

  // returns the number of pixels that exceed the scroller's size
  //
  var excess = function()
  {
    var w =
      child().best_dimension().w - (self.width() - vbar_.width());
    var h =
      child().best_dimension().h - (self.height() - hbar_.height());

    return new dimension(Math.max(0, w), Math.max(0, h));
  }

  // returns the child controlled by the scroller
  //
  var child = function()
  {
    assert(!self.option("empty"));

    assert(panel_.children_count() > 0);
    return panel_.children()[0];
  }

  var set_scrollbars = function()
  {
    var needs_hbar = false;
    var needs_vbar = false;

    if (self.option("empty"))
    {
      if (hbar_.limits().max - hbar_.limits().min != 0)
        needs_hbar = true;

      if (vbar_.limits().max - vbar_.limits().min != 0)
        needs_vbar = true;
    }
    else
    {
      var e = excess();

      if (e.w > 0)
        needs_hbar = true;

      if (e.h > 0)
        needs_vbar = true;
    }

    var vr = new rectangle(0, 0, 0, 0);
    var hr = new rectangle(0, 0, 0, 0);
    var d = undefined;

    if (needs_vbar || self.option("vbar") == "always")
    {
      d = new dimension(vbar_.best_dimension().w, self.height());
      vr = new rectangle(self.width() - d.w, 0, d.w, d.h);

      if (self.option("vbar") != "never")
        vbar_.visible(true);
    }
    else
    {
      if (self.option("vbar") != "always")
        vbar_.visible(false);
    }

    if (needs_hbar || self.option("hbar") == "always")
    {
      d = new dimension(self.width(), hbar_.best_dimension().h);
      hr = new rectangle(0, self.height() - d.h, d.w, d.h);

      if (self.option("hbar") != "never")
        hbar_.visible(true);
    }
    else
    {
      if (self.option("hbar") != "always")
        hbar_.visible(false);
    }

    if (hbar_.visible())
      vr.h -= hr.h;

    if (vbar_.visible())
      hr.w -= vr.w;

    if (hbar_.visible())
    {
      hbar_.bounds(hr);
      hbar_.page_size(hr.w);
      hbar_.do_layout();
    }
    else
    {
      hbar_.bounds(new rectangle(0, 0, 0, 0));
    }

    if (vbar_.visible())
    {
      vbar_.bounds(vr);
      vbar_.page_size(vr.h);
      vbar_.do_layout();
    }
    else
    {
      vbar_.bounds(new rectangle(0, 0, 0, 0));
    }
  };

  var set_child = function()
  {
    // resizing the internal panel so that it takes all the
    // remaining space
    panel_.bounds(new rectangle(
      0, 0,
      self.width() - vbar_.width(),
      self.height() - hbar_.height()));

    if (self.children_count() != 0  && !self.option("empty"))
    {
      // makes sure the child is never smaller than the scroller
      var bd = child().best_dimension();

      child().bounds(new rectangle(origin_.x, origin_.y, bd.w, bd.h));
      panel_.do_layout();

      var e = excess();
      hbar_.limits(0, e.w);
      vbar_.limits(0, e.h);
    }
  }

  // moves the scrollbar and resizes the child so it always have at
  // least the scroller's size
  //
  self.on_bounds_changed = function()
  {
    set_scrollbars();
    set_child();
  }

  self.do_layout = function()
  {
    self.container__do_layout();
    set_scrollbars();
    set_child();
  }

  // this is the child's dimension
  //
  self.best_dimension = function()
  {
    if (self.children_count() == 0 || self.option("empty"))
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
