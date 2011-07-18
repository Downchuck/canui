// $Id$

namespace("ui", {

// this is the button that moves back and forth; it fires dragged()
// when the user is moving the mouse after a left click. Note that
// dragged() with the original coordinates will be fired when the
// mouse is moved too far
//
slider_thumb: function(parent)
{
  ui.inherit_button(this,
    {caption: "", hover_feedback: false, pressed_feedback: false});
  var self = this;

  // mouse is moving while the left button is down
  self.dragged = new signal();

  // mouse has moved too far while dragging
  self.reset = new signal();


  // slider
  var parent_ = parent;

  // coordinates of the thumb when the drag started
  var original_ = undefined;

  // coordinates of the mouse when the drag started; this is relative
  // to the parent (because the thumb itself is moving)
  var pressed_mouse_ = undefined;


  var init = function()
  {
  };
  
  // fired by the clickable when moving the mouse while the button is
  // pressed; this moves the button
  //
  self.on_dragging = function(mp)
  {
    // mouse coordinates relative to the parent
    var pmp = new point(
      mp.x + self.position().x,
      mp.y + self.position().y);

    // delta between the current mouse position and the original
    // position when the dragging began
    var dx = (pmp.x - pressed_mouse_.x);
    var dy = (pmp.y - pressed_mouse_.y);
    var too_far = false;

    // too_far will be true if the mouse is too far from the thumb
    if (parent_.option("orientation") == "horizontal")
      too_far = (Math.abs(dy) > parent_.option("outside_limit"));
    else
      too_far = (Math.abs(dx) > parent_.option("outside_limit"));

    if (too_far)
    {
      // gives back the original coordinates if the mouse is too far
      self.dragged.fire(original_.x, original_.y);
    }
    else
    {
      // fire dragged() with the new coordinates
      if (parent_.option("orientation") == "horizontal")
        self.dragged.fire(original_.x + dx, original_.y);
      else
        self.dragged.fire(original_.x, original_.y + dy);
    }
  },

  // left button is down, remembers the mouse and thumb position
  //
  self.on_pressed = function(mp)
  {
    original_ = self.position();

    pressed_mouse_ = new point(
      mp.x + self.position().x,
      mp.y + self.position().y);
  }

  // left button is up
  //
  self.on_released = function(mp)
  {
    original_ = undefined;
    pressed_mouse_ = undefined;
  }

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "slider_thumb";
  }
},

// this is a panel with a moving thumb in it; this supports dragging
// the thumb and scrolling by clicking the empty space on each side
//
// options:
//   orientation (horizontal, vertical), default: horizontal
//     whether the slider is horizontal or vertical
//
//   outside_limit (positive integer), default: 130
//     the amount of pixels the mouse can move away from the thumb
//     before it resets
//
//   page_size (positive integer), default: 1
//     the value increment while the mouse is held down in the empty
//     space
//
//   proportional (true/false), default: false
//     whether the thumb size should be proportional to the limits
//     and slider size
//
slider: function(opts)
{
  ui.inherit_basic_panel(this,
    merge(opts, {layout: new ui.absolute_layout()}));
  var self = this;

  // fired when the thumb has moved
  self.changed = new signal();

  // fired when the limits have changed
  self.limits_changed = new signal();


  // the thumb that moves around
  var thumb_ = new ui.slider_thumb(self);

  // value_ will always be clamped between these
  var limits_ = {min: 0, max: 100};

  // current value between the limits
  var value_ = 0;

  // size of the thumb (todo: this is also in scroller)
  var size_ = 17;

  // this will fire at intervals while the left mouse button is held
  // over the empty space
  var ticker_ = new delayed_ticker(
    ui.system_options.scroll_delay,
    ui.system_options.scroll_tick_delay);


  // set to true when the left mouse button is pressed over the empty
  // space; this starts a timer so that single clicks will still work
  var tentative_scrolling_ = false;

  // when the tentative timer fires, this is set to true and another
  // shorter timer is set that will continuously page the thumb
  var scrolling_ = false;

  // while scrolling, if the mouse moves out of the area (such as on
  // the thumb or outside the empty space), this is will be set to
  // and the timer will be stoped until the left mouse button is
  // released or the mouse moves back in
  var scrolling_wait_ = false;

  // whether the user is scrolling up/left or down/right
  var scroll_up_ = false;


  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      orientation: "horizontal",
      outside_limit: 130,
      proportional: false,
      page_size: 1}); 
    
    var tr = new rectangle(0, 0, size_, size_);
    thumb_.bounds(tr);

    thumb_.dragged.add(on_thumb_dragged);

    self.borders({all: 1});
    self.option("background", ui.theme.panel_color());
    self.add(thumb_);
  };

  // fills a dark rectangle in the area where scrolling occurs
  //
  self.draw = function(context)
  {
    // the area will be darker when the control is actually scrolling;
    if ((scrolling_ || tentative_scrolling_) && !scrolling_wait_)
    {
      var r = valid_scroll_rectangle();
      fill_rect(context, ui.theme.page_scroll_color(), r);
    }

    self.basic_panel__draw(context);
  }

  // returns the size of this control minus the size of the thumb:
  // this is used to calculate the current value based on the pixel
  // position of the thumb
  //
  var usable = function()
  {
    var usable = 0;
    if (self.option("orientation") == "horizontal")
    {
      usable = self.width() - thumb_.width();
      usable -= (self.borders().left + self.borders().right);
    }
    else
    {
      usable = self.height() - thumb_.height();
      usable -= (self.borders().top + self.borders().bottom);
    }

    return usable;
  }

  // if min and max are not undefined, sets the slider limits, rounded
  // to integers, and clamps the value. When this slider is
  // proportional, this will resize the thumb.
  //
  // in any case returns the current limit as an object {max: v,
  // max: v}.
  //
  self.limits = function(min, max)
  {
    if (min != undefined && max != undefined)
    {
      limits_ = {"min": Math.min(min, max), "max": Math.max(min, max)};
      set_value(value_);

      self.limits_changed.fire();
    }

    return limits_;
  }

  // sets the page value (todo: this is in the options, the control
  // class should fire a signal when the options change; this happen
  // in several controls)
  //
  self.page_size = function(v)
  {
    self.option("page_size", v);
  }

  // if v is not undefined, sets the current value (clamped to the
  // limit), which will move the thumb to the appropriate position.
  //
  // in any case returns the current value
  //
  self.value = function(v)
  {
    if (v != undefined && value_ != v)
      set_value(v);

    return value_;
  }

  // sets the value and moves the thumb to the right place
  //
  var set_value = function(v)
  {
    v = clamp(v, limits_.min, limits_.max);
    
    value_ = v;

    if ((limits_.max - limits_.min) == 0)
    {
      self.enabled(false);
      thumb_.visible(false);
      return;
    }
    else
    {
      self.enabled(true);
      thumb_.visible(true);
    }

    // thumb position
    var p = (value_ / (limits_.max - limits_.min)) * usable();
    var r = new rectangle(0, 0, 0, 0);

    if (self.option("orientation") == "horizontal")
    {
      r.x = self.borders().left + p;
      r.y = self.borders().top;
      r.h = self.height() - (self.borders().top + self.borders().bottom);
      r.w = size_;

      if (self.option("proportional"))
      {
        r.w = self.width() - (limits_.max - limits_.min);
        if (r.w < size_)
          r.w = size_;
      }
    }
    else
    {
      r.x = self.borders().left;
      r.y = self.borders().top + p;
      r.w = self.width() - (self.borders().left + self.borders().right);
      r.h = size_;

      if (self.option("proportional"))
      {
        r.h = self.height() - (limits_.max - limits_.min);
        if (r.h < size_)
          r.h = size_;
      }
    }

    thumb_.bounds(r);

    self.changed.fire(value_);
    self.redraw();
  }

  // called from the thumb control when it has been dragged
  //
  var on_thumb_dragged = function(x, y)
  {
    var v = 0;
    if (self.option("orientation") == "horizontal")
      v = (x / usable()) * (limits_.max - limits_.min) + limits_.min;
    else
      v = (y / usable()) * (limits_.max - limits_.min) + limits_.min;

    self.value(v);
  }

  // this is an absolute layout so the thumb has to be resized to fit
  // the width/height of the slider and moved so it still fits
  //
  self.on_bounds_changed = function()
  {
    var r = thumb_.bounds();

    if (self.option("orientation") == "horizontal")
      r.h = self.height();
    else
      r.w = self.width();

    thumb_.bounds(r);
    set_value(value_);
  }

  // left button down on either side of the thumb
  //
  self.on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    if (!self.enabled())
      return;

    assert(scrolling_ === false);
    assert(tentative_scrolling_ === false);

    // the scroll direction depends on which side of the thumb was
    // clicked
    if (self.option("orientation") == "horizontal")
    {
      if (mp.x < thumb_.position().x)
        scroll_up_ = true;
      else
        scroll_up_ = false;
    }
    else
    {
      if (mp.y < thumb_.position().y)
        scroll_up_ = true;
      else
        scroll_up_ = false;
    }

    self.capture_mouse();

    // this will draw the dark rectangle
    self.redraw();

    // always move the thumb immediately
    do_tick();

    // then start the tentative scrolling timer, which will start
    // the scrolling timer in a short while; this allows for a grace
    // period for single clicks
    tentative_scrolling_ = true;
    ticker_.start(on_tick);
  }

  // left button up, anywhere
  //
  self.on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (!self.enabled())
      return;

    // note: this may be called even if no left button down event was
    // received

    // whenever the left button was down, the mouse was always
    // captured
    if (tentative_scrolling_ || scrolling_)
    {
      self.release_mouse();

      // this will hide the dark rectangle
      self.redraw();
    }

    // reset everything
    tentative_scrolling_ = false;
    scrolling_ = false;
    scrolling_wait_ = false;
    ticker_.stop();
  }

  // returns the bounds in which the current scrolling operation can
  // occur; this is either side of the thumb and it depends on the
  // orientation
  //
  var valid_scroll_rectangle = function()
  {
    var p = new point(0, 0);

    if (self.option("orientation") == "horizontal")
    {
      if (scroll_up_)
      {
        return new rectangle(
          0, 0, thumb_.position().x, self.height());
      }
      else
      {
        var x = thumb_.position().x + thumb_.width();
        return new rectangle(
          x, 0,
          self.width() - x, self.height());
      }
    }
    else
    {
      if (scroll_up_)
      {
        return new rectangle(
          0, 0, self.width(), thumb_.position().y);
      }
      else
      {
        var y = thumb_.position().y + thumb_.height();
        return new rectangle(
          0, y,
          self.width(), self.height() - y);
      }
    }
  }

  // if scrolling is in effect, this will stop scrolling if the mouse
  // is out of the valid rectangle or resume scrolling if the mouse
  // moves back in
  //
  self.on_mouse_move = function(mp)
  {
    if (!self.enabled())
      return;

    if (!scrolling_)
      return;

    check_scrolling_position(mp);
  }

  var check_scrolling_position = function(mp)
  {
    if (in_rectangle(mp, valid_scroll_rectangle()))
    {
      // mouse is over the valid rectangle

      if (scrolling_wait_)
      {
        // mouse had previously left the valid rectangle

        // restarts the tick timer without the longer initial delay
        // because the user is already scrolling
        ticker_.start_no_delay(on_tick);

        // resumes scrolling
        scrolling_wait_ = false;
      }
    }
    else
    {
      // mouse is not over the valid rectangle, stop scrolling
      ticker_.stop();
      scrolling_wait_ = true;
    }

    // this will draw or hide the dark rectangle
    self.redraw();
  };

  // called at intervals while the left button is held down over the
  // empty space, scrolls the thumb
  //
  var on_tick = function()
  {
    // the button was held down long enough, not tentative anymore
    tentative_scrolling_ = false;
    scrolling_ = true;

    var mp = self.get_root_panel().current_mouse_pos();
    mp = self.absolute_to_local(mp);
    check_scrolling_position(mp);

    if (!scrolling_wait_)
      do_tick();
  };

  // moves the thumb for a page to the correct position
  //
  var do_tick = function()
  {
    if (scroll_up_)
      self.value(value_ - self.option("page_size"));
    else
      self.value(value_ + self.option("page_size"));

    self.redraw();
  }
  
  // width/height of the thumb
  //
  self.best_dimension = function()
  {
    if (self.option("orientation") == "horizontal")
      return new dimension(0, size_);
    else
      return new dimension(size_, 0);
  }

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "slider (lim:" + limits_.min + "-" + limits_.max + " v:" + value_ + ")";
  }

  init();
}

});   // namespace ui
