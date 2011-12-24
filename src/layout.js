// $Id$

namespace("ui", {

// base class for all layouts
//
inherit_layout: function(self, opts)
{
  // for sanity checks 
  self.internal_is_a_layout = true;

  // container on which this layout applies
  var container_ = undefined;

  // options, layout-specific
  var opts_ = (opts == undefined ? {} : opts);
  

  // these need to be implemented by all derived classes

    // returns the bounds for all the controls this layout is managing
    self.get_control_bounds = function(cont) { assert(false); };

    // adds the given control 'c' to this layout; 'w' depends on the
    // derived class
    self.add = function(c, w) { assert(false); };
  
    // removes the given control from this layout
    self.remove = function(c) { assert(false); };
  
    // layouts the given container
    self.layout = function(cont) { assert(false); };
  
    // returns the best dimensions for this layout
    self.best_dimension = function() { assert(false); };
  
    // debug: returns the name of this layout
    self.dump = function() { assert(false); };

  
  // sets option 'n' to the given value if 'v' is not undefined; in
  // any case returns the current value of option 'n'. this assumes
  // 'n' is an existing option
  //
  self.layout__option = function(n, v)
  {
    assert(opts_.hasOwnProperty(n));

    if (v != undefined)
    {
      opts_[n] = v;
      self.relayout();
    }

    return opts_[n];
  };

  // sets the default options; this should be called in the layout
  // constructors
  //
  self.layout__set_default_options = function(vs)
  {
    assert(vs != undefined);
    set_default(opts_, vs);
  }


  // sets the container on which this layout applies
  //
  self.set_container = function(c)
  {
    assert(self.cont == undefined);
    assert(c.internal_is_a_container);
    
    container_ = c;
  };

  // relayouts the container associated with this layout (if any)
  //
  self.relayout = function()
  {
    if (container_ != undefined)
      container_.relayout();
  }
  
  // layouts the given container
  self.layout = function(cont)
  {
    assert(container_ == cont);
    
    var controls = self.get_control_bounds(cont);

    for (var i in controls)
    {
      var c = controls[i];
      c.control.bounds(c.bounds);
    }
  };

  // dumps the options
  //
  self.layout__dump = function()
  {
    return dump_array(opts_)
  }


  // vtable
  self.option               = self.layout__option;
  self.set_default_options  = self.layout__set_default_options;
  self.dump                 = self.layout__dump;
},


// a layout that doesn't do anything
//
absolute_layout: function(cont)
{
  ui.inherit_layout(this);
  var self = this;

  self.internal_is_a_absolute_layout = true;

  var bd_ = new dimension(0, 0);

 
  self.add = function(c, w)
  {
    // noop
  };
  
  self.remove = function(c)
  {
    // noop
  };
  
  self.layout = function(cont)
  {
    // noop
  };
  
  self.set_best_dimension = function(d)
  {
    assert(valid_dimension(d));
    bd_ = d;
    self.relayout();
  }

  self.best_dimension = function()
  {
    return new dimension(bd_.w, bd_.h);
  };
  
  self.dump = function()
  {
    return "absolute layout " + self.layout__dump();
  };
},

// this lays out controls one next to the other vertically
//
// options:
// expand (true, false), default: false
//   controls will expand to the width of the container instead of
//   using their preferred width
//
// same_size (true, false), default: false
//   controls will have the width of the widest instead of their
//   preferred width
//   note: ignored with expand
//
// halign (left, center, right), default: left
//   all controls will be aligned to the left, center or right of the
//   container
//
// valign (top, center, bottom), default: top
//   the rectangle bounding all the controls will be aligned to the
//   top, center or bottom of the container
//   note: ignored with expand
//
// margin (positive integer), default: 0
//   space between the borders of the container and the controls
//
// padding (positive integer), default: 5
//   space between each control
//
vertical_layout: function(opts)
{
  ui.inherit_layout(this, opts);
  var self = this;
  
  var init = function()
  {
    self.set_default_options(
      {expand: false, same_size: false, halign: "left",
       valign: "top", margin: 0, padding: 5});
    
    assert(one_of(self.option("halign"),
      ["left", "center", "right"]));

    assert(one_of(self.option("valign"),
      ["top", "center", "bottom"]));

    if (self.option("expand"))
      self.option("same_size", true);
  };

  // returns the width of the widest child and the total height of all
  // the children, including padding (but not the margin)
  //
  var children_dimension = function(cont)
  {
    var d = new dimension(0, 0);
    
    // getting the widest child (best width) and the sum of all
    // heights
    cont.each_child(function(c)
    {
      var bd = c.best_dimension();
      
      d.w = Math.max(d.w, bd.w);
      d.h += bd.h;
    });
    
    // adding padding
    if (cont.children_count() > 0)
      d.h += (cont.children_count() - 1) * self.option("padding");
    
    return d;
  };

  // the best dimension for a vertical layout is the sum of all the
  // heights plus the padding and margin
  //
  self.best_dimension = function(cont)
  {
    var d = children_dimension(cont);
    
    // adding margin
    d.w += self.option("margin")*2;
    d.h += self.option("margin")*2;

    return d;
  };
  
  // this layout doesn't need to track children
  //
  self.add = function(c, w)
  {
    // noop
  };
  
  // this layout doesn't need to track children
  //
  self.remove = function(c)
  {
    // noop
  };

  // returns the largest width among all the controls; this is used
  // with same_size
  //
  var widest_control = function(cont)
  {
    var widest = 0;
    cont.each_child(function(c)
    {
      widest = Math.max(widest, c.best_dimension().w);
    });

    return widest;
  };

  // returns the bounds for a single control
  //
  var calculate_control_bounds = function(c, cont, usable_cont_dim, y)
  {
    // bounds for this control
    var bounds = new rectangle(0, 0, 0, 0);

    var bd = c.best_dimension();

    // width of the control may be either the widest (for same_size),
    // the usable width (for expand) or the preferred width
    if (self.option("expand"))
      bounds.w = usable_cont_dim.w;
    else if (self.option("same_size"))
      bounds.w = widest_control(cont);
    else
      bounds.w = Math.min(usable_cont_dim.w, bd.w);
    
    // height is always the preferred height (if it fits)
    bounds.h = Math.min(bd.h, (usable_cont_dim.h - y))
      
    var x;

    // when controls use the usable width, they are always
    // positioned on the left edge
    if (self.option("expand") || self.option("halign") == "left")
      x = self.option("margin");
    else if (self.option("halign") == "right")
      x = self.option("margin") + usable_cont_dim.w - bounds.w;
    else // if (self.option("halign") == "center")
      x = cont.width()/2 - bounds.w/2;

    // this might happen when the halign is center or right and the
    // container isn't wide enough (todo: negative x might actually
    // be fine)        
    if (x < 0)
      x = 0;
        
    bounds.x = x;
    bounds.y = y;

    assert(valid_bounds(bounds));

    return bounds;
  };

  // returns the bounds for all children (todo: rename)
  //
  self.get_control_bounds = function(cont)
  {
    // width and height of the container minus the margins; this is
    // the space in which the controls can be layout
    var usable_cont_dim = new dimension(
      cont.width() - self.option("margin")*2,
      cont.height() - self.option("margin")*2);
    
    // list of the controls and their dimension
    var controls = new Array();
    
    var cd = children_dimension(cont);

    // the y position of the first child
    var y = 0;
    if (self.option("valign") == "top")
      y = self.option("margin");
    else if (self.option("valign") == "bottom")
      y = usable_cont_dim.h - cd.h - self.option("margin");
    else // if (self.option("valign") == "center")
      y = cont.height()/2 - cd.h/2;

    cont.each_child(function(c)
    {
      var bounds =
        calculate_control_bounds(c, cont, usable_cont_dim, y);

      controls.push({"control": c, "bounds": bounds});

      y += bounds.h + self.option("padding");
    });
    
    return controls;
  };
  
  // debug: dumps the options
  //
  self.dump = function()
  {
    return "vertical_layout " + dump_array(self.opts);
  };
  
  init();
},

// this lays out controls one next to the other horizontally
//
// options:
// expand (true, false), default: false
//   controls will expand to the height of the container instead of
//   using their preferred height
//
// same_size (true, false), default: false
//   controls will have the height of the highest instead of their
//   preferred height
//   note: ignored with expand
//
// halign (left, center, right), default: left
//   the rectangle bounding all the controls will be aligned to the
//   left, center or right of the container
//
// valign (top, center, bottom), default: top
//   all controls will be aligned to the top, center or bottom of the
//   container
//   note: ignored with expand
//
// margin (positive integer), default: 0
//   space between the borders of the container and the controls
//
// padding (positive integer), default: 5
//   space between each control
//
horizontal_layout: function(opts)
{
  ui.inherit_layout(this, opts);
  var self = this;
  
  var init = function()
  {
    self.set_default_options(
      {expand: false, same_size: false, halign: "left",
       valign: "top", margin: 0, padding: 5});
    
    assert(one_of(self.option("halign"),
      ["left", "center", "right"]));
    
    assert(one_of(self.option("valign"),
      ["top", "center", "bottom"]));

    if (self.option("expand"))
      self.option("same_size",  true);
  };

  // returns the height of the highest child and the total width of
  // all the children, including padding (but not the margin)
  //
  var children_dimension = function(cont)
  {
    var d = new dimension(0, 0);
    
    // getting the highest child (best highest) and the sum of all
    // widths
    cont.each_child(function(c)
    {
      var bd = c.best_dimension();
      
      d.w += bd.w;
      d.h = Math.max(d.h, bd.h);
    });
    
    // adding padding
    if (cont.children_count() > 0)
      d.w += (cont.children_count() - 1) * self.option("padding");
    
    return d;
  };

  // the best dimension for a horizontal layout is the sum of all the
  // widths plus the padding and margin
  //
  self.best_dimension = function(cont)
  {
    var d = children_dimension(cont);
    
    // adding margin
    d.w += self.option("margin")*2;
    d.h += self.option("margin")*2;

    return d;
  };
  
  // this layout doesn't need to track children
  //
  self.add = function(c, w)
  {
    // noop
  };
  
  // this layout doesn't need to track children
  //
  self.remove = function(c)
  {
    // noop
  };

  // returns the largest height among all the controls; this is used
  // with same_size
  //
  var highest_control = function(cont)
  {
    var highest = 0;
    cont.each_child(function(c)
    {
      highest = Math.max(highest, c.best_dimension().h);
    });

    return highest;
  };

  // returns the bounds for a single control
  //
  var calculate_control_bounds = function(c, cont, usable_cont_dim, x)
  {
    // bounds for this control
    var bounds = new rectangle(0, 0, 0, 0);

    var bd = c.best_dimension();

    // height of the control may be either the highest (for
    // same_size), the usable highest (for expand) or the preferred
    // height
    if (self.option("expand"))
      bounds.h = usable_cont_dim.h;
    else if (self.option("same_size"))
      bounds.h = highest_control(cont);
    else
      bounds.h = Math.min(usable_cont_dim.h, bd.h);
    
    // width is always the preferred width (if it fits)
    bounds.w = Math.min(bd.w, (usable_cont_dim.w - x));
      
    var y;

    // when controls use the usable height, they are always
    // positioned on the top edge
    if (self.option("expand") || self.option("valign") == "top")
      y = self.option("margin");
    else if (self.option("valign") == "bottom")
      y = self.option("margin") + usable_cont_dim.h - bounds.h;
    else // if (self.option("valign") == "center")
      y = cont.height()/2 - bounds.h/2;

    // this might happen when the valign is center or bottom and the
    // container isn't high enough (todo: negative y might actually
    // be fine)        
    if (y < 0)
      y = 0;
        
    bounds.x = x;
    bounds.y = y;

    assert(valid_bounds(bounds));

    return bounds;
  };

  // returns the bounds for all children (todo: rename)
  //
  self.get_control_bounds = function(cont)
  {
    // width and height of the container minus the margins; this is
    // the space in which the controls can be layout
    var usable_cont_dim = new dimension(
      cont.width() - self.option("margin")*2,
      cont.height() - self.option("margin")*2);
    
    // list of the controls and their dimension
    var controls = new Array();
    
    var cd = children_dimension(cont);

    // the x position of the first child
    var x = 0;
    if (self.option("halign") == "left")
      x = self.option("margin");
    else if (self.option("halign") == "right")
      x = usable_cont_dim.w - cd.w - self.option("margin");
    else // if (self.option("halign") == "center")
      x = cont.width()/2 - cd.w/2;

    cont.each_child(function(c)
    {
      var bounds =
        calculate_control_bounds(c, cont, usable_cont_dim, x);

      controls.push({"control": c, "bounds": bounds});

      x += bounds.w + self.option("padding");
    });
    
    return controls;
  };
  
  // debug: dumps the options
  //
  self.dump = function()
  {
    return "horizontal_layout " + this.layout__dump();
  };
  
  init();
},

// sides for the border layout
sides: make_enum(
[
  "center",
  "top",
  "right",
  "bottom",
  "left",
  "count"
]),

// has 5 different areas: left, top, right, bottom and center. Side
// areas will try to respect preferred dimension, center will take the
// remaining space. If the center exceeds maximum dimension, sides
// will be decreased by half the exceeding size on each side.
//
// options:
// margin (positive integer), default: 0
//   space between the borders of the container and the controls
//
// padding (positive integer), default: 5
//   space between an area in which there is a control and the center
//   
border_layout: function(opts)
{
  ui.inherit_layout(this, opts);
  var self = this;
  
  // array of controls, 5 elements, corresponds to values in
  // ui.sides
  var controls_ = [];


  // constructor
  //
  var init = function()
  {
    self.set_default_options({margin: 0, padding: 0});
  
    for (var i=0; i<ui.sides.count; ++i)
      controls_.push(undefined);
  };

  // this is the preferred dimension of all the sides (including
  // center), plus padding and margin
  //  
  self.best_dimension = function(cont)
  {
    var c = undefined, bd = undefined;

    var lr = new dimension(0, 0);
    var tb = new dimension(0, 0);

    c = controls_[ui.sides.left];
    if (c)
    {
      bd = c.best_dimension();
      lr.w += bd.w;
      lr.h = Math.max(lr.h, bd.h);
    }
    
    c = controls_[ui.sides.right];
    if (c)
    {
      bd = c.best_dimension();
      lr.w += bd.w;
      lr.h = Math.max(lr.h, bd.h);
    }

    c = controls_[ui.sides.top];
    if (c)
    {
      bd = c.best_dimension();
      tb.w = Math.max(tb.w, bd.w);
      tb.h += bd.h;
    }

    c = controls_[ui.sides.bottom];
    if (c)
    {
      bd = c.best_dimension();
      tb.w = Math.max(tb.w, bd.w);
      tb.h += bd.h;
    }

    var d = new dimension(0, 0);

    c = controls_[ui.sides.center];
    if (c)
    {
      bd = c.best_dimension();
      
      d.w = Math.max(lr.w + tb.w, lr.w + bd.w);
      d.h = Math.max(tb.h + lr.h, tb.h + bd.h);
      
      if (controls_[ui.sides.left])
        d.w += self.option("padding");
      if (controls_[ui.sides.right])
        d.w += self.option("padding");
      
      if (controls_[ui.sides.top])
        d.h += self.option("padding");
      if (controls_[ui.sides.bottom])
        d.h += self.option("padding");
    }
    else
    {
      d.w = Math.max(lr.w, tb.w);
      d.h = lr.h + tb.h;
    }

    d.w += self.option("margin")*2;
    d.h += self.option("margin")*2;

    return d;
  };
  
  // sets the control in the given area; w must be from
  // ui.sides. This assumes that there is no control in
  // this area.
  //
  self.add = function(c, w)
  {
    assert(w >= 0 && w < ui.sides.count);
    assert(controls_[w] == undefined);

    controls_[w] = c;
  };
  
  // removes the control from this layout (whatever area it is in);
  // noop if not found
  //
  self.remove = function(c)
  {
    for (var i in controls_)
    {
      if (controls_[i] == c)
      {
        controls_[i] = undefined;
        return;
      }
    }
  };

  // returns the bounds for all children (todo: rename)
  //
  self.get_control_bounds = function(cont)
  {
    var controls = new Array();
    
    // width and height of the container minus the margins; this is
    // the space in which the controls can be layout
    var usable_w = cont.width() - self.option("margin")*2;
    var usable_h = cont.height() - self.option("margin")*2;

    // by default, center takes all space; this will be modified by
    // each side if there's a control there    
    var center = new rectangle(
      self.option("margin"), self.option("margin"),
      usable_w, usable_h);

    // each side will set their bounds
    var top = undefined;
    var right = undefined;
    var bottom = undefined;
    var left = undefined;
    
    // top-left
    var x0 = self.option("margin");
    var y0 = self.option("margin");

    var w = 0, h = 0;
    
    var c = controls_[ui.sides.top];
    if (c)
    {
      // top uses its preferred height and all the available width
      h = c.best_dimension().h;
      top = new rectangle(x0, y0, usable_w, h);
      
      center.y = y0 + h;
      center.h -= h;

      if (controls_[ui.sides.center])
      {
        center.y += self.option("padding");
        center.h -= self.option("padding");
      }
    }
    
    c = controls_[ui.sides.bottom];
    if (c)
    {
      // bottom uses its preferred height and all the available width
      h = c.best_dimension().h;
      bottom = new rectangle(x0, y0 + usable_h - h, usable_w, h);
      
      center.h -= h;

      if (controls_[ui.sides.center])
        center.h -= self.option("padding");
    }

    c = controls_[ui.sides.left];
    if (c)
    {
      // left uses its preferred width and all the remaining height
      w = c.best_dimension().w;
      left = new rectangle(x0, center.y, w, center.h);
      
      center.x += x0 + w;
      center.w -= w;

      if (controls_[ui.sides.center])
      {
        center.x += self.option("padding");
        center.w -= self.option("padding");
      }
    }
    
    c = controls_[ui.sides.right];
    if (c)
    {
      // right uses its preferred width and all the remaining height
      w = c.best_dimension().w;
      right = new rectangle(x0 + usable_w - w, center.y, w, center.h);
      
      center.w -= w;

      if (controls_[ui.sides.center])
        center.w -= self.option("padding");
    }

    var d = 0, md = undefined;
    
    c = controls_[ui.sides.center];
    if (c)
      adjust_center(c, center, left, top, right, bottom);

    // adding the controls if present
    if (top)
    {
      assert(valid_bounds(top));
      controls.push(
        {"control": controls_[ui.sides.top],
        "bounds": top});
    }
    
    if (right)
    {
      assert(valid_bounds(right));
      controls.push(
        {"control": controls_[ui.sides.right],
        "bounds": right});
    }

    if (bottom)
    {
      assert(valid_bounds(bottom));
      controls.push(
        {"control": controls_[ui.sides.bottom],
        "bounds": bottom});
    }
      
    if (left)
    {
      assert(valid_bounds(left));
      controls.push(
        {"control": controls_[ui.sides.left],
        "bounds": left});
    }
      
    if (controls_[ui.sides.center])
    {
      assert(valid_bounds(center));
      controls.push(
        {"control": controls_[ui.sides.center],
        "bounds": center});
    }
    
    return controls;
  };

  var adjust_center = function(c, center, left, top, right, bottom)
  {
    var md = c.maximum_dimension();
    if (md == undefined)
      return;

    // if width/height is larger than the maximum, it is distributed
    // on each side. If both sides are present, the difference is
    // split between the two. If only one side is present, all the
    // difference is given to it. If neither side is present, this
    // container shouldn't have been given the extra size and the
    // center will go against its maximum size

    var d = 0;

    if (center.w > md.w)
    {
      // width is larger than its maximum

      d = center.w - md.w;
          
      if (controls_[ui.sides.left] &&
          controls_[ui.sides.right])
      {
        // both sides; split the width
        left.w += d/2;
        right.w += d/2;
        right.x -= d/2;
            
        center.x -= d/2;
        center.w -= d;
      }
      else if  (controls_[ui.sides.left])
      {
        // only left, give it the difference
        left.w += d;
        center.x += d;
        center.w -= d;
      }
      else if (controls_[ui.sides.right])
      {
        // only right, give it the difference
        right.w += d;
        right.x -= d;
        center.w -= d;
      }
    }
    
    if (center.h > md.h)
    {
      // height is larger than its maximum

      d = center.h - md.h;
        
      if (controls_[ui.sides.top] &&
          controls_[ui.sides.bottom])
      {
        // both sides: split the height
        top.h += d/2;
        bottom.h += d/2;
        bottom.x -= d/2;
            
        center.y += d/2;
        center.h -= d;
      }
      else if  (controls_[ui.sides.top])
      {
        // only top, give it the difference
        top.h += d;
        center.y += d;
        center.h -= d;
      }
      else if (controls_[ui.sides.bottom])
      {
        // only bottom, give it the difference
        bottom.h += d;
        bottom.y -= d;
        center.h -= d;
      }
    }
  };
   
  // debug: dumps the options
  //  
  self.dump = function()
  {
    var s = "border_layout ";
    
    return s + self.layout__dump();
  };
  
  init();
},

// arranges the children in a grid with 'xcount' children
// horizontally. Children use all the available width, but normally
// use their preferred height, unless same_size is given, in which
// case all children will have the height of the highest one.
//
// options:
// same_size (true/false), default: false
//   use the height of the highest control for every control
//
// margin (positive integer), default: 0
//   space between the borders of the container and the controls
//
// hpadding (positive integer), default: 0
//   horizontal space between two children
//   
// vpadding (positive integer), default: 0
//   vertical space between two children
// 
// padding (positive integer), default: none
//   sets both hpadding and vpadding to the given value
//
grid_layout: function(xcount, opts)
{
  ui.inherit_layout(this, opts);
  var self = this;
  
  // number of controls horizontally
  var xcount_ = xcount;
  

  // constructor
  //
  var init = function()
  {
    assert(xcount_ > 0);

    self.set_default_options(
      {margin: 0, hpadding: 0, vpadding: 0, same_size: false});
    
    if (opts != undefined)
    {
      if (opts.padding != undefined)
      {
        self.option("hpadding", opts.padding);
        self.option("vpadding", opts.padding);
      }
    }
  };

  // changes the number of horizontal controls to the given value if
  // not undefined; in any case returns the current value
  //
  self.xcount = function(c)
  {
    if (c != undefined)
    {
      xcount_ = c;
      self.relayout();
    }

    return xcount_;
  }
  
  // this layout doesn't need to track children
  //
  self.add = function(c, w)
  {
    // noop
  };
  
  // this layout doesn't need to track children
  //
  self.remove = function(c)
  {
    // noop
  };

  // returns width of the widest control and the height of the highest
  // control
  //
  var largest_dimension = function(cont)
  {
    var w = 0, h = 0;
    
    cont.each_child(function (c)
    {
      var bd = c.best_dimension();

      w = Math.max(w, bd.w);
      h = Math.max(h, bd.h);
    });

    return new dimension(w, h);
  };

  // uses the width of the widest control times xcount and either
  // the sum of the highest heights on each line or the highest height
  // times the number of lines (for same_size)
  //
  self.best_dimension = function(cont)
  {
    var ycount = 1;
    if (cont.children_count() > 0)
      ycount = to_int((cont.children_count() - 1) / xcount_) + 1;
     
    var largest = largest_dimension(cont);
    var d = new dimension(largest.w, 0);

    if (self.option("same_size"))
    {
      // for same_size, use the widest and highest
      d.h = largest.h * ycount;
    }
    else
    {
      // without same_size, still use the widest, but use the highest
      // on each line

      var highest = 0;

      var i = 0;
      cont.each_child(function (c)
      {
        var bd = c.best_dimension();

        highest = Math.max(highest, bd.h);
      
        // at the end of each line or for the last child
        if ((i > 0 && ((i + 1) % xcount_) === 0) ||
            (i + 1 == cont.children_count()))
        {
          d.h += highest;
          highest = 0;
        }

        ++i;
      });
    }

    // here, d.w and d.h have the total width and height; padding and
    // margin are still missing
    
    var m = self.option("margin") * 2;

    d.w += (xcount_ - 1) * self.option("hpadding") + m;
    d.h += (ycount - 1) * self.option("vpadding") + m;

    return d;
  };

  // returns the bounds for all children (todo: rename)
  //
  self.get_control_bounds = function(cont)
  {
    var controls = new Array();
    
    // width and height of the container minus the margins; this is
    // the space in which the controls can be layout
    var usable_w = cont.width() - self.option("margin")*2;
    var usable_h = cont.height() - self.option("margin")*2;

    // all controls have the same width, which is the usable width
    // minus the padding    
    var cw =
      (usable_w - (xcount_ - 1) * self.option("hpadding")) / xcount_;
    
    var x0 = self.option("margin");
    var y0 = self.option("margin");
    
    var i=0;
    var x = x0;
    var y = y0;

    // 'highest' can be either the highest control of all (for
    // same_size) or the highest on this row (reset at the end of each
    // row); used to move to the next line. note that without
    // same_size, the preferred height is always used
    var highest = 0;
    if (self.option("same_size"))
      highest = largest_dimension(cont).h;
    
    cont.each_child(function (c)
    {
      // last child on this row
      if (i > 0 && (i % xcount_) === 0)
      {
        // back to the left side
        x = x0;

        // next row
        y += highest + self.option("vpadding");
       
        // reset the highest for the new row 
        if (!self.option("same_size"))
          highest = 0;
      }

      var bounds = new rectangle(x, y, cw, 0);
      
      if (self.option("same_size"))
      {
        // all controls have the same height
        bounds.h = highest;
      }
      else
      {
        var h = c.best_dimension().h;
        highest = Math.max(highest, h);

        // all controls use their preferred height        
        bounds.h = h;
      }
      
      assert(valid_bounds(bounds));

      controls.push({"control": c, "bounds": bounds});
      
      // this will be reset to x0 on the next line
      x += cw + self.option("hpadding");

      ++i;
    });
    
    return controls;
  };

  // debug: dumps options
  //  
  self.dump = function()
  {
    return "grid layout " + self.layout__dump();
  };
  
  init();
}

});   // namespace ui
