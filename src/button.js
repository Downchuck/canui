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
//   clicked (function()), default: undefined
//     initial clicked slot
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

  var original_ = false;
  var captured_ = false;


  var init = function(opts)
  {
    self.set_default_options({
      caption: "",
      clicked: undefined,
      pressed_feedback: true,
      hover_feedback: true,
      flat: false,
      toggle: false});

    if (self.option("clicked") != undefined)
      self.clicked.add(self.option("clicked"));

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

  self.clickable__transitioning = function()
  {
    return captured_;
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
    
      if (label_ != undefined)
        label_.remove();

      label_ = lb;
    
      self.add(label_, ui.sides.center);
    }

    return label_;
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
      original_ = pressed_;
    }
    else
    {
      self.set_state(true, true);
    }

    captured_ = true;
    self.capture_mouse();

    self.on_pressed(mp);

    self.redraw();
  };
  
  // releases the button; if the mouse is still over the button, this
  // fires the click handler
  //
  self.clickable__on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    if (!self.enabled() || !captured_)
      return;

    captured_ = false;
    self.release_mouse();
    self.on_released(mp);

    if (self.option("toggle"))
    {
      if (hovered_)
        self.set_state(hovered_, !original_);
    }
    else
    {
      self.set_state(hovered_, false);

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
  self.transitioning        = self.clickable__transitioning;
  self.set_state            = self.clickable__set_state;

  init(opts);
},

// see inherit_clickable
//
inherit_button: function(self, opts)
{
  ui.inherit_clickable(self, opts);
  
  // draws a rectangle (reversed when pressed and hovered)
  //
  self.draw = function(context)
  {
    if (self.option("pressed_feedback"))
    {
      if (self.pressed() && (self.is_hovered() || self.option("toggle")))
        self.force_padding(new dimension(1, 1));
      else
        self.force_padding(new dimension(0, 0));
    }

    var p = false;
    var h = false;

    if (self.option("toggle"))
      p = self.pressed();
    else if (self.pressed() && self.is_hovered() && self.option("pressed_feedback"))
      p = true;
    
    if (self.is_hovered() && self.option("hover_feedback"))
      h = true;

    if (!self.option("flat") || self.is_hovered() || self.pressed())
      fill_3d_rect(context, !p, h, self.bounds());
    
    self.container__draw(context);
  };
},

button: function(opts)
{
  ui.inherit_button(this, opts);
},

// options:
// padding (positive integer), default: 5
// space between the checkbox and the label
//
checkbox: function(opts)
{
  ui.inherit_clickable(this, merge(opts, {toggle: true}));
  var self = this;

  var image_ = undefined;

  var init = function()
  {
    image_ = load_image(
      image_dir() + "/check.png", "x", mem_fun('redraw', self));

    self.add(new ui.spacer(
      {size: new dimension(
        ui.system_options.checkbox_size,
        ui.system_options.checkbox_size)}),
      ui.sides.left);
  };
  
  // forwards to clickable__pressed
  //
  self.checked = function(b)
  {
    return self.clickable_pressed(b);
  };

  self.draw = function(context)
  {
    var p = false;
    var h = false;

    var f = new color().white();
    if (self.transitioning() && self.is_hovered())
      f = ui.theme.face_color();

    var r = self.bounds();
    r = new rectangle(
      r.x, r.y + r.h/2 - ui.system_options.checkbox_size/2,
      ui.system_options.checkbox_size,
      ui.system_options.checkbox_size);

    fill_3d_rect(context, false, false, r, f);

    if (self.pressed())
    {
      var ir = new rectangle(
        r.x + r.w/2 - image_.width()/2,
        r.y + r.h/2 - image_.height()/2,
        image_.width(),
        image_.height());

      draw_image(context, image_, ir);
    }
    
    self.container__draw(context);
  };

  init();
}

});   // namespace ui
