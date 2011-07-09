// $Id$

namespace("ui",
{

// this handles hovering, pressing, dragging and drawing of a button-
// like control; fires clicked() when left mouse button is pressed and
// released over the button
//
// caption() will create a label and call label() with it; label() can
// be used to add an arbitrary control to the button. note that
// whatever is given to label() will be set as transparent so the
// button receives events instead of the label
//
// options:
//   hover_feedback (true/false), default: true
//     whether the button color should change when hovered
//
//   pressed_feedback(true/false), default: true
//     whether the button should change appearance when pressed and
//     hovered
//
//   flat (true/false), default: false
//     if true, the borders will only appear when hovered
//
//   toggle (true/false), default: false
//     if true, immediately changes the toggle state on left mouse
//     button down; this does not capture the mouse
//
//   caption (string), default: ""
//     initial caption on the button
//
inherit_clickable: function(self, opts)
{
  ui.inherit_container(self,
    merge(opts, {layout: new ui.border_layout({margin: 5})}));


  // called when the button is clicked
  self.clicked = new signal();


  // the control inside the button
  var label_ = undefined;

  // whether the button is currently hovered (todo: use hovered()
  // instead)
  var hovered_ = false;

  // whether the button is currently pressed (regardless of hovering)
  var pressed_ = false;


  var init = function(opts)
  {
    self.set_default_options({
      caption: "",
      pressed_feedback: true,
      hover_feedback: true,
      flat: false,
      toggle: false});

    self.caption(self.option("caption"));
  };

  // if b is not undefined, sets the pressed state; this is ignored
  // if the button is not a toggle
  //
  // in any case returns the current pressed state
  //
  self.clickable__pressed = function(b)
  {
    if (b != undefined && self.option("toggle"))
    {
      self.set_state(hovered_, b);
      self.redraw();
    }

    return pressed_;
  }

  // make sure the button has enough width so that the rounded
  // rectangle still looks okay
  //
  self.clickable__best_dimension = function()
  {
    var d = self.container__best_dimension();
    //if (d.w < 25)
     // d.w = 25;

    return d;
  }

  // forward to the label
  //
  self.clickable__font = function(f)
  {
    return label_.font(f);
  }
  
  // creates a label with the given string and calls label() with
  // it
  //
  self.clickable__caption = function(s)
  {
    if (s == undefined)
      s = "";
    
    self.label(new ui.label({caption: s, halign: "center"}));
  };
  
  // sets 'lb' as the only control in the button if not undefined; in
  // any case returns the current label control
  //
  self.clickable__label = function(lb)
  {
    if (lb != undefined)
    {
      assert(lb.internal_is_a_control);

      // events will go to the button, not the label
      lb.transparent(true);
    
      label_ = lb;
    
      self.remove_all();
      self.add(label_, ui.sides.center);
    }

    return label_;
  };
  
  // draws a rectangle (reversed when pressed and hovered)
  //
  self.clickable__draw = function(context)
  {
    var p = false;
    var h = false;

    if (self.option("toggle"))
      p = pressed_;
    else if (pressed_ && hovered_ && self.option("pressed_feedback"))
      p = true;
    
    if (hovered_ && self.option("hover_feedback"))
      h = true;

    if (!self.option("flat") || hovered_ || pressed_)
      fill_3d_rect(context, !p, h, self.bounds());
    
    self.container__draw(context);
  };

  // hook: user released the left mouse button over the control
  //
  self.clickable__on_click = function()
  {
    // noop
  }

  // hook: user is moving the mouse while pressing the button
  //
  self.clickable__on_dragging = function()
  {
    // noop
  }

  // hook: button enters the pressed state
  //
  self.clickable__on_pressed = function()
  {
    // noop
  }

  // hook: button is released
  //
  self.clickable__on_released = function()
  {
    // noop
  }
  
  // presses the button
  //
  self.clickable__on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);
    
    if (!self.enabled())
      return;

    if (self.option("toggle"))
    {
      self.set_state(true, !pressed_);
    }
    else
    {
      self.set_state(true, true);
      self.capture_mouse();
    }

    self.on_pressed(mp);

    self.redraw();
  };
  
  // releases the button; if the mouse is still over the button, this
  // fires the click handler
  //
  self.clickable__on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    if (!self.enabled() || !pressed_)
      return;

    if (!self.option("toggle"))
    {
      self.release_mouse();
      self.set_state(hovered_, false);
      self.on_released(mp);

      if (hovered_)
        self.clicked.fire();
    }
    
    self.redraw();
  };

  // calls on_dragging() if the button is currently pressed
  //
  self.clickable__on_mouse_move = function(mp)
  {
    if (!pressed_ || self.option("toggle"))
      return;

    self.on_dragging(mp);
  }
  
  // highlights the button, but will also press it if the button was
  // already pressed but the mouse had moved away
  //
  self.clickable__on_mouse_enter = function(mp)
  {
    self.control__on_mouse_enter(mp);
    
    if (!self.enabled())
      return;
      
    self.set_state(true, pressed_);
    self.redraw();
  };
  
  // removes the highlight and unpresses the button if pressed
  //
  self.clickable__on_mouse_leave = function()
  {
    self.control__on_mouse_leave();
    
    if (!self.enabled())
      return;
      
    self.set_state(false, pressed_);
    self.redraw();
  };

  // changes the padding to offset the child label
  // (todo: see container.force_padding)
  //  
  self.clickable__set_state = function(hovered, pressed)
  {
    hovered_ = hovered;
    pressed_ = pressed;
    
    if (self.option("pressed_feedback"))
    {
      if (pressed_ && (hovered_ || self.option("toggle")))
        self.force_padding(new dimension(1, 1));
      else
        self.force_padding(new dimension(0, 0));
    }
  };
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    var s = "button";
    if (label_.caption != undefined)
      s += " (" + label_.caption() + ")";
    return s;
  };


  self.best_dimension       = self.clickable__best_dimension;
  self.font                 = self.clickable__font;
  self.caption              = self.clickable__caption;
  self.label                = self.clickable__label;
  self.draw                 = self.clickable__draw;
  self.pressed              = self.clickable__pressed;
  self.on_mouse_left_down   = self.clickable__on_mouse_left_down;
  self.on_mouse_left_up     = self.clickable__on_mouse_left_up;
  self.on_mouse_move        = self.clickable__on_mouse_move;
  self.on_mouse_enter       = self.clickable__on_mouse_enter;
  self.on_mouse_leave       = self.clickable__on_mouse_leave;
  self.on_pressed           = self.clickable__on_pressed;
  self.on_released          = self.clickable__on_released;
  self.on_click             = self.clickable__on_click;
  self.on_dragging          = self.clickable__on_dragging;
  self.set_state            = self.clickable__set_state;

  init(opts);
},

// see inherit_clickable
//
button: function(opts)
{
  ui.inherit_clickable(this, opts);
}

});   // namespace ui
