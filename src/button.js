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
//     if true, clicking the button (down + up while over) will change
//     its state, instead of getting a temporary pressed state while
//     the mouse button is down
//
//   fast (true/false), default: false
//     ignore if toggle is false; toggles the button on left button
//     down instead of waiting for up + hover; this does not capture
//     the mouse
//
//   caption (string), default: ""
//     initial caption on the button
//
//   clicked (function()), default: undefined
//     initial clicked slot
//
// todo: clean up the hooks, some are redundant; they may be all
//       unnecessary, in fact
//
inherit_clickable: function(self, opts)
{
  ui.inherit_container(self,
    merge(opts, {layout: new ui.border_layout()}));


  // fired when the button is clicked
  self.clicked = new signal();

  // fired when the button is pressed; this will not be called again
  // unless the button is release, that is, it won't be fired
  // repeatedly even if the mouse goes in and out while dragging
  self.down = new signal();

  // fire when the button is released; this will be called when the
  // mouse left button goes up, whether it is over the button or not
  self.up = new signal();


  // the control inside the button
  var label_ = undefined;

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
      fast: false,
      toggle: false});

    if (self.option("clicked") != undefined)
      self.clicked.add(self.option("clicked"));

    self.caption(self.option("caption"));
  };

  // if b is not undefined, sets the pressed state; in any case
  // returns the current state
  //
  self.clickable__pressed = function(b)
  {
    if (b != undefined)
    {
      pressed_ = b;
      self.redraw();
    }

    return pressed_;
  }

  self.clickable__transitioning = function()
  {
    return captured_;
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
    
      if (label_ != undefined)
        label_.remove();

      label_ = lb;
    
      self.add(label_, ui.sides.center);

      // events will go to the button, not the label
      self.each_child_recursive(function(c)
      {
        c.transparent(true);
      });
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

    var cap = true;

    if (self.option("toggle"))
    {
      if (self.option("fast"))
      {
        self.pressed(!pressed_);
        self.clicked.fire();
        cap = false;
      }
      else
      {
        original_ = pressed_;
      }
    }
    else
    {
      self.pressed(true);
    }

    if (cap)
    {
      captured_ = true;
      self.capture_mouse();
    }

    self.down.fire();
    self.on_pressed(mp);

    self.redraw();
  };
  
  // releases the button; if the mouse is still over the button, this
  // fires the click handler
  //
  self.clickable__on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (!self.enabled() || !captured_)
      return;

    var do_click = true;

    if (self.option("toggle"))
    {
      if (self.is_hovered() && !self.option("fast"))
      {
        self.pressed(!original_);
        do_click = false;
      }
    }
    else
    {
      self.pressed(false);
    }
    
    self.up.fire();

    if (do_click)
    {
      if (self.is_hovered())
        self.clicked.fire();
    }

    if (captured_)
    {
      captured_ = false;
      self.release_mouse();
    }

    self.on_released(mp);
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
      
    self.redraw();
  };
  
  // removes the highlight and unpresses the button if pressed
  //
  self.clickable__on_mouse_leave = function()
  {
    self.control__on_mouse_leave();
    
    if (!self.enabled())
      return;
      
    self.redraw();
  };
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    var s = "clickable";
    if (label_.caption != undefined)
      s += " (" + label_.caption() + ")";
    return s;
  };


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

  init(opts);
},

// see inherit_clickable
//
// options:
//   small (true/false), default: false
//   reduces the size of the 3d border for small buttons
//
inherit_button: function(self, opts)
{
  ui.inherit_clickable(self, opts);
  self.internal_is_a_button = true;

  
  var init = function()
  {
    self.set_default_options({
      small: false
    });

    self.layout().option("margin", 5);
  };
  
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
      fill_3d_rect(context, !p, h, self.bounds(), undefined, self.option("small"));
    
    self.container__draw(context);
  };

  self.typename = function()
  {
    return "button";
  };

  init();
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
  self.internal_is_a_checkbox = true;

  var image_ = undefined;

  var init = function()
  {
    image_ = load_image(
      "check.png", "x", mem_fun('redraw', self));

    self.layout().option("padding", 3);

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

  self.typename = function()
  {
    return "checkbox";
  }

  init();
},

radio: function(opts)
{
  ui.inherit_clickable(this, merge(opts, {toggle: true}));

  var self = this;
  self.internal_is_a_radio = true;

  var init = function()
  {
    self.layout().option("padding", 3);

    self.add(new ui.spacer(
      {size: new dimension(
        ui.system_options.radio_size,
        ui.system_options.radio_size)}),
      ui.sides.left);
  };

  self.pressed = function(b)
  {
    var r = self.clickable__pressed();

    if (b != undefined)
    {
      self.clickable__pressed(true);

      self.parent().each_child(function(c)
        {
          if (c == self)
            return;

          if (c.internal_is_a_radio)
            c.clickable__pressed(false);
        });
    }

    return r;
  }

  // forwards to pressed()
  //
  self.checked = function(b)
  {
    return self.pressed(b);
  };

  self.draw = function(context)
  {
    var f = new color().white();
    if (self.transitioning() && self.is_hovered())
      f = ui.theme.face_color();
      
    var r = self.bounds();
    r = new rectangle(
      r.x, r.y + r.h/2 - ui.system_options.radio_size/2,
      ui.system_options.radio_size,
      ui.system_options.radio_size);

    r.x += ui.system_options.radio_size/2 + 1;
    r.y += ui.system_options.radio_size/2;
    r.w = ui.system_options.radio_size - 2;

    fill_circle(context, f, r);
    outline_circle(context, new color().black(), r, Math.PI/6, 5*Math.PI/4);
    outline_circle(context, ui.theme.face_color(), r, Math.PI/6, 5*Math.PI/4, true);

    if (self.pressed())
    {
      r.w = ui.system_options.radio_size/3;
      fill_circle(context, new color().black(), r);
    }

    self.container__draw(context);
  };

  self.typename = function()
  {
    return "radio";
  }

  init();
}

});   // namespace ui
