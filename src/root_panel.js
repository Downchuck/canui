// $Id$

namespace("ui", {

// the root panel is the toplevel control; it handles events and
// redraws itself automatically on a timer when needed
// todo: merge the handle_something, they were used when the framework
// wasn't registering the handlers itself
//
// options:
// canvas (canvas object), mandatory
//   canvas on which this root panel operates
//
// dimension (dimension object), mandatory
//   width and height of the canvas
//
root_panel: function(opts)
{
  this.internal_is_a_root_panel = true;

  ui.inherit_container(this, opts);
  var self = this;
   

  // fired after the panel has been drawn, calls f(t) where 't' is
  // the draw time
  self.drawn = new signal();

  
  // canvas for this root panel
  var canvas_ = undefined;

  // control on which the mouse currently is
  var hovered_ = undefined;

  // control that has the focus
  var focused_ = undefined;

  // control that has the mouse capture
  var captured_ = undefined;

  // list of floating controls; these have absolute coordinates and
  // are managed by the root panel manually (mostly for tooltips)
  var floating_ = new Array();

  // whether the controls need to be relayout; individual controls
  // don't have this flag because the whole thing always need to be
  // relayout
  var needs_layout_ = true;

  // draws the panel when fired
  var draw_timer_ = undefined;

  // last mouse coordinates, used by current_mouse_pos() since there's
  // no way to get the current coordinates
  var last_mouse_ = new point(-80000, -80000);

  // control key states
  var key_states_ = {shift: false, ctrl: false, alt: false};
  

  var init = function()
  {
    assert(self.option("canvas") != undefined);
    canvas_ = self.option("canvas");

    // todo
    set_global_context(canvas_[0].getContext("2d"));

    canvas_.attr({
      width: self.option("dimension").w,
      height: self.option("dimension").h});

    self.bounds(new rectangle(
      1, 1,
      self.option("dimension").w-2,
      self.option("dimension").h-2));
  
    // note that mouse move, leave and up are registered on the
    // window, not on the canvas. This is so the mouse can be
    // "captured" when drag operations are under way
    canvas_.mousedown(on_mouse_down_event);
    canvas_.mouseout(on_mouse_leave_event);
    canvas_.dblclick(on_double_click_event);
    canvas_.blur(on_blur_event);
    canvas_.focus(on_focus_event);
    canvas_.keypress(on_keypress_event);
    canvas_.keydown(on_keydown_event);
    canvas_.keyup(on_keyup_event);
    canvas_.mousewheel(on_scroll_event);
    $(window).mousemove(on_mouse_move_event);
    $(window).mouseout(on_mouse_leave_event);
    $(window).mouseup(on_mouse_up_event);

    draw_timer_ = setInterval(on_draw_timer, 50);
  };

  // returns the canvas on which this root panel is working
  //
  self.canvas = function()
  {
    return canvas_;
  }

  // returns the state of the control keys
  //
  self.key_state = function(c)
  {
    switch(c)
    {
      case ui.key_codes.shift:
        return key_states_.shift;
      case ui.key_codes.alt:
        return key_states_.alt;
      case ui.key_codes.ctrl:
        return key_states_.ctrl;
    }

    assert(false);
    return false;
  };

  // called when the the draw timer fires
  //
  var on_draw_timer = function()
  {
    var now = new Date().getTime();
  
    // draw() will return false when nothing had to be drawn
    if (!self.draw(canvas_[0].getContext("2d")))
      return;
  
    // updating the draw time and indicator
    self.drawn.fire(new Date().getTime() - now);
  }

  // called by the canvas callbacks
  //
  var set_last_mouse = function(p)
  {
    last_mouse_ = new point(p.x, p.y);
  }

  // returns the current mouse position
  //
  self.current_mouse_pos = function()
  {
    return new point(last_mouse_.x, last_mouse_.y);
  }

  // called when the canvas lost focus
  //
  var on_blur_event = function()
  {
    // if a key is pressed, focus is lost and the key is released, the
    // internal state won't be updated; there is no way of capturing
    // the keyboard to receive the keyup event
    //
    // therefore, all the states are reset when focus is lost; this is
    // not perfect, but it avoids some bugs
    for (var i in key_states_)
      key_states_[i] = false;

    self.set_focus(undefined);
  };

  // called when the canvas gets focus
  //
  var on_focus_event = function()
  {
    // noop
  };

  // called when a key is pressed when the canvas has focus
  //
  var on_keypress_event = function(event)
  {
    if (focused_ == undefined)
      return;

    if (focused_.on_keypress(event.which))
      event.preventDefault();
  };

  // called when a key is down when the canvas has focus
  //
  var on_keydown_event = function(event)
  {
    switch (event.which)
    {
      case ui.key_codes.shift:
      {
        key_states_.shift = true;
        break;
      }

      case ui.key_codes.ctrl:
      {
        key_states_.ctrl = true;
        break;
      }

      case ui.key_codes.alt:
      {
        key_states_.alt = true;
        break;
      }
    }

    if (focused_ == undefined)
      return;

    if (focused_.on_keydown(event.which))
      event.preventDefault();
  };

  // called when a key is up when the canvas has focus
  //
  var on_keyup_event = function(event)
  {
    switch(event.which)
    {
      case ui.key_codes.shift:
      {
        key_states_.shift = false;
        break;
      }

      case ui.key_codes.ctrl:
      {
        key_states_.ctrl = false;
        break;
      }

      case ui.key_codes.alt:
      {
        key_states_.alt = false;
        break;
      }
    }

    if (focused_ == undefined)
      return;

    if (focused_.on_keyup(event.which))
      event.preventDefault();
  }

  // called when the mouse scrolls over the canvas
  //
  var on_scroll_event = function(ev, delta)
  {
    // mouse coordinates relative to the canvas
    var mp = mouse_pos(ev); 
    
    set_last_mouse(mp);

    var c = active_control();
    if (!c)
      return;

    if (c.on_mouse_scroll(c.absolute_to_local(mp), delta))
      ev.preventDefault();
  }

  // called when the mouse moves over the canvas (or anywhere if
  // captured)
  //
  var on_mouse_move_event = function(ev)
  {
    // mouse coordinates relative to the canvas
    var mp = mouse_pos(ev); 

    // note that on_mouse_move is called on the window, so the
    // coordinates need to be offset manually
    mp.x -= canvas_.offset().left;
    mp.y -= canvas_.offset().top;
    
    set_last_mouse(mp);
    
    handle_mouse_move(mp);
  };
  
  // called when the mouse leaves the canvas
  //
  var on_mouse_leave_event = function(ev)
  {
    handle_mouse_leave();
  };

  // called for double clicks over the canvas
  //
  var on_double_click_event = function(ev)
  {
    var mp = mouse_pos(ev);
    set_last_mouse(mp);

    if (ev.button === 0)
    {
      var c = active_control();
      if (!c)
        return;

      self.set_focus(c);
      c.on_double_click(c.absolute_to_local(mp));
    }
  }
  
  // called when one of the mouse buttons is down; this can only
  // happen over the canvas
  //
  var on_mouse_down_event = function(ev)
  {
    var mp = mouse_pos(ev);
    set_last_mouse(mp);

    if (ev.button === 0)
      handle_mouse_left_down(mp);
  };
  
  // called when one of the mouse buttons is up; this can happen
  // outside the canvas if the mouse is captured
  //
  var on_mouse_up_event = function(ev)
  {
    var mp = mouse_pos(ev);

    // note that on_mouse_move is called on the window, so the
    // coordinates need to be offset manually
    mp.x -= canvas_.offset().left;
    mp.y -= canvas_.offset().top;

    set_last_mouse(mp);

    if (ev.button === 0)
      handle_mouse_left_up(mp);
  };

  // also checks the floating controls
  //
  self.is_dirty = function()
  {
    for (var i in floating_)
    {
      if (floating_[i].control.is_dirty())
        return true;
    }
    
    return self.container__is_dirty();
  };


  // called when the draw timer fires
  //
  self.draw = function(context)
  {
    // layout if needed
    if (needs_layout_)
    {
      needs_layout_ = false;

      self.do_layout();
      self.redraw();

      for (var i in floating_)
      {
        var f = floating_[i];
        if (f.manage)
          f.control.dimension(floating_[i].best_dimension());

        f.control.do_layout();
      }

      // because the position of the controls might have changed, the
      // one that was hovered might not be there anymore. This will
      // recheck the hovered control
      handle_mouse_move(self.current_mouse_pos());
    }
    
    // don't redraw if the root panel ain't dirty
    if (!self.is_dirty())
      return false;

    context.save();

    // outline the canvas
    context.clearRect(0, 0, canvas_.width(), canvas_.height());
    outline_rect(
      context, new color().black(),
      new rectangle(0, 0, canvas_.width(), canvas_.height()));

    // drawing everything in this container
    self.container__draw(context);

    context.restore();

    // drawing the floating controls
    for (var i in floating_)
    {
      var f = floating_[i];

      if (f.manage)
      {
        // making sure the floating controls are not outside this
        // panel
        check_floating_position(f);
      }

      context.save();
      f.control.draw(context);
      context.restore();
    }
    
    return true;
  };
  
  // repositions the floating controls if some are out of bounds
  //
  var check_floating_position = function(f)
  {
    var r = f.bounds();
    var sd = new dimension(canvas_.width(), canvas_.height());
    
    if (r.x + r.w > sd.w)
      r.x = sd.w - r.w - 1;
    if (r.x < self.bounds().x)
      r.x = self.bounds().x;
    
    if (r.y + r.h > sd.h)
      r.y = sd.h - r.h - 1;
    if (r.y < self.bounds().y)
      r.y = self.bounds().y;
    
    f.bounds(r);
  };

  // used by controls to up the chain and find the root panel
  //
  self.get_root_panel = function()
  {
    return self;
  };

  // returns the hovered control, undefined if none
  //
  self.hovered = function()
  {
    return hovered_;
  }

  // returns the focused control, undefined if none
  //
  self.focused = function()
  {
    return focused_;
  }
  
  // called by control.relayout(), will trigger a layout on the next
  // redraw
  //
  self.relayout = function()
  {
    needs_layout_ = true;
    self.redraw();
  };
  
  // captures the mouse for the given control; this assumes no
  // capture is currently in place
  //
  self.capture_mouse = function(c)
  {
    assert(c.internal_is_a_control);
    assert(self.has_child(c));
    
    captured_ = c;

    // todo: not supported on chrome
    if (canvas_[0].setCapture != undefined)
      canvas_[0].setCapture();
  };
  
  // release the mouse capture for the given control; this assumes
  // the current capture is for that control
  //
  self.release_mouse = function(c)
  {
    assert(c.internal_is_a_control);
    assert(captured_ == c);
    assert(self.has_child(c));
    
    var cap = captured_;
    captured_ = undefined;

    // todo: not supported on chrome
    if (canvas_[0].releaseCapture != undefined)
      canvas_[0].releaseCapture();
    
    // because the move events were forwarded to the capture, what's
    // under the cursor now needs to be checked
    var mp = self.current_mouse_pos();
    var c = self.find_control(mp, false);

    if (cap != c)
    {
      hovered_ = undefined;
      handle_hover(c, mp);
    }
  };

  // checks the floating controls first
  //
  self.find_control = function(mp, include_transparent)
  {
    for (var i in floating_)
    {
      var f = floating_[i].control;

      var c = f.find_control(mp);
      if (c != undefined)
        return c;
    }

    return self.container__find_control(mp, include_transparent);
  };
  
  // remove_child handles both floating and regular controls
  //
  self.remove_child = function(c)
  {
    // if this is a floating control, remove it
    for (var i=0; i<floating_.length; ++i)
    {
      if (floating_[i].control == c)
      {
        floating_.splice(i, 1);
        c.internal_set_parent(undefined);
        self.redraw();
        
        return;
      }
    }
    
    // if not, it might be in the container
    self.container__remove_child(c);
  };

  // also checks the floating controls
  //
  self.has_child = function(ct)
  {
    if (self.container__has_child(ct))
      return true;
    
    for (var i in floating_)
    {
      if (floating_[i].control.has_child(ct))
        return true;
    }
    
    return false;
  };

  
  // adds the given control as floating
  //
  self.add_floating = function(c, manage)
  {
    assert(c.internal_is_a_control);
    assert(c.parent() == undefined);

    if (manage == undefined)
      manage = true;
    
    c.internal_set_parent(self);
    floating_.push({control: c, manage: manage});

    self.relayout();
  };
  
  // returns either the hovered or the captured control
  //
  var active_control = function()
  {
    if (captured_ != undefined)
    {
      // this is a sanity check: if the control that had the capture
      // has now disappeared, cancel the capture
      if (!self.has_child(captured_))
        release_mouse(captured_);
      else
        return captured_;
    }

    return hovered_;
  };

  // gives the given control the focus
  //
  self.set_focus = function(c)
  {
    if (c != undefined && !c.needs_focus())
      return;

    if (focused_ == c)
      return;

    if (focused_)
      focused_.on_blur(c);

    focused_ = c;

    if (focused_)
      focused_.on_focus(c);
  }

  // called when the mouse has moved over the root panel
  //
  var handle_mouse_move = function(mp)
  {
    var c = self.find_control(mp, false);
    handle_hover(c, mp);
  };
  
  // called when the left button is down
  //
  var handle_mouse_left_down = function(mp)
  {
    var c = active_control();
    if (!c)
      return;

    self.set_focus(c);
    c.on_mouse_left_down(c.absolute_to_local(mp));
  };

  // called when the left button is up
  //  
  var handle_mouse_left_up = function(mp)
  {
    // left up is ignored if it is outside the root panel and there
    // is no capture. This is to make sure we don't eat events that
    // don't belong to us
    if (mp.x < 0 || mp.y < 0 ||
        mp.x >= self.width() || mp.y >= self.height())
    {
      if (!captured_)
        return;
    }
    
    var c = active_control();
    if (!c)
      return;
    
    c.on_mouse_left_up(c.absolute_to_local(mp));
  };

  // called when the mouse leaves the root panel
  //  
  var handle_mouse_leave = function()
  {
    handle_hover(undefined, undefined);
  };
  
  // called from various callbacks where 'c' is the new hovered
  // control and 'mp' the current mouse coordinates relative to the
  // root panel
  //
  var handle_hover = function(c, mp)
  {
    var cursor = "";

    if (c != hovered_)
    {
      // the hovered control has changed

      // the previous hovered control will be notified that the mouse
      // has left only if there is no capture or if it is captured
      if (hovered_)
      {
        if (!captured_ || (captured_ == hovered_))
          hovered_.on_mouse_leave();
      }

      hovered_ = c;
      
      // the newly hovered control will be notified that the mouse
      // has entered only if there is no capture or if it is captured
      if (hovered_)
      {
        if (captured_ == undefined || (captured_ == hovered_))
          hovered_.on_mouse_enter(mp);
      }
    }
    
    // from this point, further callbacks will be called on the
    // capture, if any
    if (captured_)
    {
      c = captured_;

      // makes sure the cursor is the one from the captured control
      cursor = c.cursor();
    }

    // c might be undefined if there is no capture and the mouse has
    // just left the root panel
    if (c)
    {
      // mp might be undefined if the mouse has just left the root
      // panel
      if (mp != undefined)
      {
        c.on_mouse_move(c.absolute_to_local(mp));

        // make sure the cursor is the one from the active control
        cursor = c.cursor();
      }
    }
    
    // todo: can this happen?
    if (cursor === "")
      cursor = "default";

    canvas_.css("cursor", cursor);
  };
  
  // debug: returns this root panel's name
  //
  self.typename = function()
  {
    return "root panel";
  };
  
  // debug: dumps info about this root panel
  //
  self.dump = function()
  {
    var s = self.container__dump(0) + "\n";

    for (var i in floating_)
      s += "floating: " + floating_[i].control.dump(0) + "\n";

    return s;
  };


  init();
}

});   // namespace ui
