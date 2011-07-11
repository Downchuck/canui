// $Id$

namespace("ui", {

// base class for all controls
//
inherit_control: function(self, opts)
{
  // for sanity checks
  self.internal_is_a_control = true;
  
  // signal fired when this control is detached from a root panel
  // note: this is fired even if this control still has a parent, but
  // that parent (or any parent in this tree) was removed from a root
  // panel,
  self.detached = new signal();

  
  // todo: merge pos_ and dim_ into bounds_

  // id of this control in the hierarchy
  var id_ = "";

  // x,y position
  var pos_ = new point(0, 0);

  // dimension
  var dim_ = new dimension(0, 0);

  // this control's parent
  var internal_parent_ = undefined;

  // whether this control needs to be redrawn
  // todo: the whole root panel is currently redrawn everytim
  var dirty_ = true;

  // whether this control should let the events go through; note that
  // transparency is not inherited
  var transparent_ = false;

  // whether this control is enabled. note that this is not handled
  // by the framework; individual controls need to discard the events
  // themselves. this allows some controls to retain some sort of
  // reaction, such as disabled buttons still showing tooltips
  var enabled_ = true;

  // whether this control and its children is visible or not
  var visible_ = true;

  // mouse cursor over this control
  var cursor_ = "default";

  // tooltip for this control
  var tooltip_ = undefined;

  // current timer for the tooltip. this is started when the mouse
  // stops moving over the control and is continuously reset until
  // 1) the mouse moves away or; 2) the mouse stays still long enough
  // for the timer to expire (at which point the tooltip is shown)
  var tooltip_timer_ = undefined;

  // time the mouse has to stay still over the control to show the
  // tooltip
  var tooltip_delay_ = 300;

  // borders to draw around the control. note that this does not
  // offset the children and the borders are drawn *before* the
  // children, if this is a container
  var borders_ = {left: 0, top: 0, right: 0, bottom: 0};

  // font used by this control; this has no effect on the control
  // unless derived controls use it
  var font_ = ui.theme.default_font();

  // control-dependent options
  var opts_ = (opts == undefined ? {} : opts);


  // constructor
  //
  var init = function()
  {
    assert(typeof(opts_) == "object");

    var b = new rectangle(0, 0, 0, 0);

    if (opts_.position != undefined)
    {
      b.x = opts_.position.x;
      b.y = opts_.position.y;
    }

    if (opts_.dimension != undefined)
    {
      b.w = opts_.dimension.w;
      b.h = opts_.dimension.h;
    }

    self.bounds(b);
  };

  // if i is not undefined, sets this control's id; in any case
  // returns the current id
  //
  self.id = function(i)
  {
    if (i != undefined)
      id_ = i;
    return id_;
  };

  // returns this control if the ids match
  //
  self.control__find_id = function(i)
  {
    if (id_ == i)
      return self;
    return undefined;
  }

  // sets this control's cursor when hovered if 'c' is not undefined;
  // in any case, returns the current cursor
  //
  self.control__cursor = function(c)
  {
    if (c != undefined)
      cursor_ = c;

    return cursor_;
  }

  // sets whether this control is transparent if 't' is not undefined;
  // in any case, returns the current transparent state
  //
  self.control__transparent = function(t)
  {
    if (t != undefined)
      transparent_ = t;

    return transparent_;
  }

  // sets the font used by this control if 'f' is not undefined;
  // in any case, returns the current font. Note that this has no
  // effect on the control unless the derived classes use it
  //
  self.control__font = function(f)
  {
    if (f != undefined)
    {
      font_ = f;
      self.relayout();
    }

    return font_;
  }

  // sets option 'n' to the given value if 'v' is not undefined; in
  // any case returns the current value of option 'n'. this assumes
  // 'n' is an existing option
  //
  self.control__option = function(n, v)
  {
    assert(opts_.hasOwnProperty(n));

    if (v != undefined)
    {
      opts_[n] = v;
      self.relayout();
    }

    return opts_[n];
  };

  // sets all the options in 'opts' by calling "option(i, opts[i])"
  // for each element
  //
  self.control__options = function(opts)
  {
    for (var i in opts)
      self.option(i, opts[i]);
  };

  // sets the default options; this should be called in the layout
  // constructors
  //
  self.control__set_default_options = function(vs)
  {
    assert(vs != undefined);
    set_default(opts_, vs);
  }

  // sets the tooltip used by this control if 't' is not undefined;
  // if the previous tooltip is currently shown, it will be removed
  // and the timer reset.  If pos (absolute) is specified, the tooltip
  // will be shown there; otherwise the tooltip's position will depend
  // on the mouse (see check_tooltip())
  //
  // see reset_tooltip() to remove it
  //
  // in any case, returns the tooltip used by this control; may return
  // undefined if there's no tooltip
  //
  self.control__tooltip = function(t, pos)
  {
    if (t != undefined)
    {
      if (tooltip_ != undefined)
        self.reset_tooltip();
    
      tooltip_ = t;
    
      if (tooltip_ == undefined)
        return;
    
      if (pos != undefined)
        tooltip_.position(pos);
      else
        tooltip_.position(new point(-1, -1));
    }

    return tooltip_;
  }

  // internal, called from container; sets this control's parent
  //
  self.internal_set_parent = function(cont)
  {
    // if cont is undefined, this control is being detached, in
    // which case internal_parent must not be undefined; if cont
    // is a valid container, this control can't already have a parent
    if (cont != undefined)
      assert(self.internal_parent == undefined);
    else
      assert(self.internal_parent != undefined);

    // cont must be valid
    assert(cont == undefined || cont.internal_is_a_container);

    self.internal_parent = cont;

    // this control was removed from the tree, fire the signal. note
    // that container's implementation will do the same for all its
    // children
    if (cont == undefined)
      self.trigger_detached();
  };
  
  // fires the detached signal
  //
  self.control__trigger_detached = function()
  {
    // kill the tooltip because this control is gone
    self.reset_tooltip();
    self.detached.fire();
  };
  
  // returns whether this control is enabled. note: this does not
  // account for the state of the parents; if this control is enabled
  // but its parent isn't, this will still return true.
  //
  self.control__strictly_enabled = function()
  {
    return enabled_;
  };
  
  // if b is not undefined, sets this control's enabled status. In any
  // case, returns whether this control and all of its parents are
  // enabled. note: it only needs one disabled control in the parent
  // chain for this to return false.
  // 
  self.control__enabled = function(b)
  {
    if (b != undefined)
    {
      enabled_ = b;
      self.redraw();
    }
    
    if (!enabled_)
      return false;

    if (self.internal_parent)
      return self.internal_parent.enabled();
    
    return true;
  };

  // if v is not undefined, sets this control's visibility status; in
  // any case returns whether this control is visible
  //
  self.control__visible = function(v)
  {
    if (v != undefined)
    {
      visible_ = v;
      self.redraw();
    }

    return visible_;
  }
  
  // returns this control's parent
  //
  self.control__parent = function()
  {
    return self.internal_parent;
  };
  
  // returns whether this control is dirty
  //
  self.control__is_dirty = function()
  {
    return dirty_;
  };
  
  // returns whether this control is currently hovered; this only
  // checks for this control, not its parents
  //
  self.control__is_hovered = function()
  {
    if (!self.internal_parent)
      return false;
    
    var r = self.get_root_panel();
    if (r == undefined)
      return false;
    
    if (r.hovered() == self)
      return true;
    
    return false;
  };

  // returns whether this control is currently focused
  //
  self.control__is_focused = function()
  {
    if (!self.internal_parent)
      return false;
    
    var r = self.get_root_panel();
    if (r == undefined)
      return false;
    
    if (r.focused() == self)
      return true;
    
    return false;
  }
  
  // marks this control as dirty
  //
  self.control__redraw = function()
  {
    dirty_ = true;
  };
  
  // marks the root panel as needing to be layout
  //
  self.control__relayout = function()
  {
    if (!self.internal_parent)
      return;
    
    var r = self.get_root_panel();
    if (r == undefined)
      return;
    
    r.relayout();
  };
  
  // called from this control's parent so it can layout itself;
  // controls don't usually layout anything
  //
  self.control__do_layout = function()
  {
    // noop
  };
  
  // removes this control from its parent; this assumes the control
  // has a parent
  //
  self.control__remove = function()
  {
    assert(self.internal_parent);
    assert(self.internal_parent.internal_is_a_container);
    
    self.internal_parent.remove_child(self);
  };
  
  // returns the number of children for this control; this is
  // overriden by container
  //
  self.control__children_count = function()
  {
    return 0;
  };
  
  // whether this control has the given child; because controls
  // don't have children, this only returns true if 'c' is this
  //
  self.control__has_child = function(c)
  {
    if (c == self)
      return true;
    return false;
  };
  
  // if p is not undefined, uses it to set this control's position.
  // in any case, returns the current position of this control
  //
  self.control__position = function(p)
  {
    if (p)
      self.bounds(new rectangle(p.x, p.y, dim_.w, dim_.h));
    
    return new point(pos_.x, pos_.y);
  };
  
  // if d is not undefined, uses it to set this control's dimension
  // in any case, returns the current dimension of this control
  self.control__dimension = function(d)
  {
    if (d)
      self.bounds(new rectangle(pos_.x, pos_.y, d.w, d.h));
    
    return new dimension(dim_.w, dim_.h);
  };
  
  // returns this control's width
  //
  self.control__width = function()
  {
    return dim_.w;
  };
  
  // returns this control's height
  //
  self.control__height = function()
  {
    return dim_.h;
  };
  
  // returns this control's best dimension; this should be overriden
  // by derived classes
  //
  self.control__best_dimension = function()
  {
    return new dimension(0, 0);
  };
  
  // returns this control's maximum dimension; if undefined, there
  // is no maximum size for this control
  // 
  self.control__maximum_dimension = function()
  {
    return undefined;
  };
 
  // if r is not undefined, sets this control's bounds. in any case,
  // returns the current bounds
  //
  self.control__bounds = function(r)
  {
    if (r != undefined)
    {
      assert(valid_bounds(r));

      // only relayout if the bounds are different
      if (pos_.x != r.x || pos_.y != r.y ||
          dim_.w != r.w || dim_.h != r.h)
      {
        pos_.x = r.x;
        pos_.y = r.y;
        dim_.w = r.w;
        dim_.h = r.h;

        self.on_bounds_changed();
        self.relayout();
      }
    }
    
    return new rectangle(
      pos_.x, pos_.y, dim_.w, dim_.h);
  };
  
  // converts the given point from a local coordinate to an absolute
  // coordinate (relative to the highest parent, usually the root
  // panel)
  //
  self.control__local_to_absolute = function(p)
  {
    p = new point(p.x + pos_.x, p.y + pos_.y);
    
    if (!self.internal_parent)
      return p;
    
    return self.internal_parent.local_to_absolute(p);
  };
  
  // converts the given point from an absolute coordinate (relative
  // to the highest parent, usually the root panel) to a relative
  // coordinate
  //
  self.control__absolute_to_local = function(p)
  {
    assert(p);
    p = new point(p.x - pos_.x, p.y - pos_.y);
    
    if (!self.internal_parent)
      return p;
    
    return self.internal_parent.absolute_to_local(p);
  };
  
  // called when the mouse is entering or moving over this control;
  // this starts a timer which will show the tooltip when fired
  var check_tooltip = function()
  {
    // because check_tooltip() is called for every mouse movement, 
    // the current timer has to be reset
    if (tooltip_timer_)
    {
      clearTimeout(tooltip_timer_);
      tooltip_timer_ = undefined;
    }
      
    // no tooltip or tooltip already shown
    if (!tooltip_ || tooltip_.parent() != undefined)
      return;

    tooltip_timer_ = setTimeout(on_tooltip_timer, tooltip_delay_);
  };

  // fired when the tooltip timer is over
  //
  var on_tooltip_timer = function()
  {
    var rp = self.get_root_panel();
    assert(rp != undefined);

    tooltip_timer_ = undefined;

    // at this point, the tooltip may not have been layout yet and
    // its content may have changed. because tooltips are not part
    // of the normal hierarchy, it needs to be layout manually here
    tooltip_.dimension(tooltip_.best_dimension());
    tooltip_.do_layout();
    
    // the tooltip position may have been hardcoded in set_tooltip().
    // if that's not the case, position it so its bottom-left corner
    // is on the mouse's hotspot
    if (tooltip_.position().x == -1 &&
        tooltip_.position().y == -1)
    {
      var p = rp.current_mouse_pos();
      p.y -= tooltip_.height();
      tooltip_.position(p);
    }
    
    // tooltips are floating controls added directly to the root panel
    rp.add_floating(tooltip_);
  }
  
  // internal, removes the tooltip (if shown) and kills the timer
  //
  self.reset_tooltip = function()
  {
    if (tooltip_)
    {
      if (tooltip_.parent() != undefined)
        tooltip_.remove();
      
      tooltip_.position(new point(-1, -1));
    }
    
    if (tooltip_timer_)
    {
      clearTimeout(tooltip_timer_);
      tooltip_timer_ = undefined;
    }
  };
  
  // called when the mouse has moved over this control; the default
  // implementation manages the tooltip; 'mp' is relative to the
  // control
  //
  self.control__on_mouse_move = function(mp)
  {
    check_tooltip();
  };
  
  // called when the mouse has entered this control; this default
  // implementation manages the tooltip; 'mp' is relative to the
  // control
  //
  self.control__on_mouse_enter = function(mp)
  {
    check_tooltip();
  };
  
  // fired when the mouse leaves this control; default implementation
  // resets the tooltip
  //
  self.control__on_mouse_leave = function()
  {
    self.reset_tooltip();
  };
  
  // fired when the mouse's left button is down over this control;
  // 'mp' is relative to the control
  self.control__on_mouse_left_down = function(mp)
  {
    // noop
  };
  
  // fired when the mouse's left button is up over this control; 'mp'
  // is relative to the control
  //
  self.control__on_mouse_left_up = function(mp)
  {
    // noop
  };

  // fired when the mouse is double clicked over this control; 'mp' is
  // relative to the control
  //
  self.control__on_double_click = function(mp)
  {
  }

  // fired when the control gets focus
  //
  self.control__on_focus = function(other)
  {
    // noop
  };

  // fired when the control loses focus
  //
  self.control__on_blur = function(other)
  {
    // noop
  };

  // fired when this control has focus and the canvas receives a
  // key press; return true if the event is consumed
  //
  self.control__on_keypress = function(code)
  {
    // noop
    return false;
  };

  // fired when this control has focus and the canvas receives a
  // key down; return true if the event is consumed
  //
  self.control__on_keydown = function (code)
  {
    // noop
    return false;
  };

  // fired when this control has focus and the canvas receives a
  // key up; return true if the event is consumed
  //
  self.control__on_keyup = function(code)
  {
    // noop
    return false;
  };

  // fired when the mouse wheel is scrolled over this control; return
  // true if the event is consumed
  //
  self.control__on_mouse_scroll = function(delta)
  {
    // noop

    // note: scroll is always consumed so that the page doesn't
    // scroll
    return true;
  }

  // fired when this control's bounds have changed
  //
  self.control__on_bounds_changed = function()
  {
    // noop
  }
  
  // draws this control, usually reimplemented by derived classes;
  // default implementation resets the dirty flag and draws the
  // borders
  //
  self.control__draw = function(context)
  {
    dirty_ = false;
    self.draw_borders(context, clone(borders_), self.bounds());
  }

  // draws the borders around this control
  //
  self.control__draw_borders = function(context, bs, r)
  {
    var b = r;

    if (bs.left > 0)
    {
      draw_line(
        context, new color().black(),
        new rectangle(b.x, b.y, bs.left, b.h));
    }

    if (bs.top > 0)
    {
      draw_line(
        context, new color().black(),
        new rectangle(b.x, b.y, b.w, bs.top));
    }

    if (bs.right > 0)
    {
      draw_line(
        context, new color().black(),
        new rectangle(b.x+b.w-1, b.y, bs.right, b.h));
    }

    if (bs.bottom > 0)
    {
      draw_line(
        context, new color().black(),
        new rectangle(b.x, b.y+b.h-1, b.w, bs.bottom));
    }
  };

  // if b is not undefined, sets the borders around this control. 'b'
  // is a map that can contain "left", "top", "right" and "bottom", 
  // or "all".
  //
  // in any case, returns the current borders as an object with
  // "left", "top", "right" and "bottom"
  //
  self.control__borders = function(b)
  {
    if (b != undefined)
    {
      if (b.all != undefined)
      {
        borders_ =
          {left: b.all, top: b.all, right: b.all, bottom: b.all};
      }
      else
      {
        if (b.left != undefined)
          borders_.left = b.left;
        if (b.top != undefined)
          borders_.top = b.top;
        if (b.right != undefined)
          borders_.right = b.right;
        if (b.bottom != undefined)
          borders_.bottom = b.bottom;
      }
    }

    return borders_;
  }
  
  // returns whether 'p' is within this control's bounds; this is
  // used mostly by container.find_control(). note that if this
  // control is marked as transparent, it will never be found unless
  // include_transparent is true.
  //
  self.control__find_control = function(p, include_transparent)
  {
    if (!include_transparent && transparent_)
      return undefined;
    
    if (p.x >= pos_.x && p.y >= pos_.y)
    {
      if (p.x < (pos_.x + dim_.w))
      {
        if (p.y < (pos_.y + dim_.h))
          return self;
      }
    }

    return undefined;
  };
  
  // returns the root panel for this control or undefined if there
  // is none
  //
  self.control__get_root_panel = function()
  {
    if (self.internal_parent == undefined)
      return undefined;
    
    return self.internal_parent.get_root_panel();
  };
  
  // captures the mouse for this control; all events will be
  // redirected to this control; assumes no other control is currently
  // capturing the mouse
  //
  self.capture_mouse = function()
  {
    assert(self.internal_parent);
    var rp = self.get_root_panel();
    
    assert(rp);
    rp.capture_mouse(self);
  };
  
  // release the mouse capture; assumes this control has already
  // captured the mouse
  //
  self.release_mouse = function()
  {
    assert(self.internal_parent);
    self.get_root_panel().release_mouse(self);
  };
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "control";
  };
  
  // debug: dumps info about this control
  //
  self.control__dump = function(indent)
  {
    var s = "";
    for (var i=0; i<indent; ++i)
      s += "   ";
    
    s += 
      self.typename() + " ";

    if (id_ != "")
      s += "id:" + id_ + " ";

    if (self.enabled())
      s += "enabled ";
    else
      s += "disabled ";

    if (self.visible())
      s += "visible ";
    else
      s += "hidden ";

    s +=
      "(" + pos_.x + "x," + pos_.y + "y)-" +
      "(" + dim_.w + "w," + dim_.h + "h)";
    
    return s;
  };

  // vtable
  self.find_id              = self.control__find_id;
  self.is_dirty             = self.control__is_dirty;
  self.relayout             = self.control__relayout;
  self.do_layout            = self.control__do_layout;
  self.transparent          = self.control__transparent;
  self.redraw               = self.control__redraw;
  self.enabled              = self.control__enabled;
  self.visible              = self.control__visible;
  self.cursor               = self.control__cursor;
  self.set_default_options  = self.control__set_default_options;
  self.option               = self.control__option;
  self.options              = self.control__options;
  self.tooltip              = self.control__tooltip;
  self.font                 = self.control__font;
  self.strictly_enabled     = self.control__strictly_enabled;
  self.borders              = self.control__borders;
  self.parent               = self.control__parent;
  self.remove               = self.control__remove;
  self.is_hovered           = self.control__is_hovered;
  self.is_focused           = self.control__is_focused;
  self.children_count       = self.control__children_count;
  self.has_child            = self.control__has_child;
  self.trigger_detached     = self.control__trigger_detached;
  self.position             = self.control__position;
  self.dimension            = self.control__dimension;
  self.width                = self.control__width;
  self.height               = self.control__height;
  self.bounds               = self.control__bounds;
  self.best_dimension       = self.control__best_dimension;
  self.maximum_dimension    = self.control__maximum_dimension;
  self.local_to_absolute    = self.control__local_to_absolute;
  self.absolute_to_local    = self.control__absolute_to_local;
  self.on_mouse_move        = self.control__on_mouse_move;
  self.on_mouse_left_down   = self.control__on_mouse_left_down;
  self.on_mouse_left_up     = self.control__on_mouse_left_up;
  self.on_double_click      = self.control__on_double_click;
  self.on_mouse_enter       = self.control__on_mouse_enter;
  self.on_mouse_leave       = self.control__on_mouse_leave;
  self.on_focus             = self.control__on_focus;
  self.on_blur              = self.control__on_blur;
  self.on_keypress          = self.control__on_keypress;
  self.on_keydown           = self.control__on_keydown;
  self.on_keyup             = self.control__on_keyup;
  self.on_mouse_scroll      = self.control__on_mouse_scroll;
  self.on_bounds_changed    = self.control__on_bounds_changed;
  self.draw                 = self.control__draw;
  self.draw_borders         = self.control__draw_borders;
  self.find_control         = self.control__find_control;
  self.get_root_panel       = self.control__get_root_panel;
  self.dump                 = self.control__dump;
  
  init();
}

});   // namespace ui
