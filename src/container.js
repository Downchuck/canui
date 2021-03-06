// $Id$

namespace("ui", {

// base class for all containers
//
inherit_container: function(self, opts)
{
  ui.inherit_control(self, opts);

 
  // for sanity checks 
  self.internal_is_a_container = true;

  // children of this container
  var children_ = new Array();

  // layout manager
  var layout_ = undefined;

  // this is something of a hack: it is mostly used by buttons to
  // offset the children when pressed. There's no easy way to do this
  // with layouts so these values are merely added to the canvas
  // transformation
  // todo: a better, generic way might be better
  var force_padding_ = new dimension(0, 0);
  

  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      layout: new ui.vertical_layout()});

    layout_ = self.option("layout");
    assert(layout_ != undefined);
    assert(layout_.internal_is_a_layout);
    
    layout_.set_container(self);
  };

  // sets the padding in this control if 'p' (a dimension object) is
  // not undefined (see force_padding_); in any case, returns the
  // current padding
  //
  self.force_padding = function(p)
  {
    if (p != undefined)
    {
      assert(p.internal_is_a_dimension);

      if (force_padding_.w != p.w || force_padding_.h != p.h)
      {
        force_padding_ = p;
        self.redraw();
      }
    }

    return force_padding_;
  }
  
  // whether this container, or any of its children, is dirty
  //
  self.container__is_dirty = function()
  {
    if (!self.visible())
      return false;

    if (self.control__is_dirty())
      return true;

    for (var i in children_)
    {
      var c = children_[i];
      if (c.is_dirty())
        return true;
    }
    
    return false;
  };

  // returns the children in this container; the array is a copy of
  // the internal one, but it shouldn't be modified
  //
  self.children = function()
  {
    var r = [];
    for (var i in children_)
      r.push(children_[i]);
    return r;
  };

  // calls f(c) for each child
  //
  self.each_child = function(f)
  {
    for (var i in children_)
      f(children_[i]);
  };
  
  // calls f(c) for each child, recursive
  //
  self.each_child_recursive = function(f)
  {
    for (var i in children_)
    {
      var c = children_[i];
      f(c);
      
      if (c.children_count() > 0)
        c.each_child_recursive(f);
    }
  }

  // asks the layout manager for this container's best dimensions
  //
  self.container__best_dimension = function()
  {
    var d = layout_.best_dimension(self);
    assert(valid_dimension(d));

    return d;
  };
  
  // draws this container; this will clip children. note that the
  // context is restored after each children
  //
  self.container__draw = function(context)
  {
    context.save();
    clip(context, self.bounds());
    
    // offseting
    context.translate(
      to_int(self.position().x + force_padding_.w),
      to_int(self.position().y + force_padding_.h));
    
    var sc = sorted_children();
    for (var i=sc.length-1; i>=0; --i)
    {
      var c = sc[i];

      if (c.visible())
      {
        context.save();
        c.draw(context);
        context.restore();
      }
    }

    context.restore();

    self.control__draw(context);
  };
  
  // sets the layout manager for this container if 'ly' is not
  // undefined. this assumes no children have been added yet: the
  // layout cannot be changed if the container already has children
  //
  // in any case, returns the current layout
  //
  self.container__layout = function(ly)
  {
    if (ly != undefined)
    {
      assert(self.children.length === 0);
      assert(ly.internal_is_a_layout);
        
      layout_ = ly;
      layout_.set_container(self);
    }

    return layout_;
  };
  
  // removes the given child from this container; noop if not found
  //
  self.container__remove_child = function(c)
  {
    assert(c.internal_is_a_control);

    var rp = self.get_root_panel();

    if (rp != undefined)
    {
      if (c.internal_is_a_container)
      {
        c.each_child_recursive(function(cc)
          {
            rp.notify_remove(cc);
          });
      }
      else
      {
        rp.notify_remove(c);
      }
    }
    
    var sc = sorted_children();
    for (var i=0; i<sc.length; ++i)
    {
      if (sc[i] == c)
      {
        for (var j=i+1; j<sc.length; ++j)
          sc[j].internal_set_zorder(j - 1);

        break;
      }
    }

    for (var i=0; i<children_.length; ++i)
    {
      if (children_[i] == c)
      {
        c.internal_set_parent(undefined);
        children_.splice(i, 1);

        layout_.remove(c);        
        
        self.redraw();
        self.relayout();
        break;
      }
    }
  };

  var sorted_children = function()
  {
    var sc = children_.concat([]);
    sc.sort(function(a, b)
      {
        if (a.zorder().z < b.zorder().z)
          return -1;
        else if (a.zorder().z > b.zorder().z)
          return 1;
        return 0;
      });
    
    return sc;
  };

  self.container__internal_set_child_zorder = function(c, z)
  {
    assert(is_number(z));
    assert(self.has_child(c));

    var sc = sorted_children();

    if (sc[z].zorder().s == "topmost")
    {
      for (var i=z; i<sc.length; ++i)
      {
        z = i;

        if (sc[i].zorder().s != "topmost")
          break;
      }
    }

    assert(z >= 0 && z < sc.length);

    if (z < c.zorder().z)
    {
      for (var i=z; i<c.zorder().z; ++i)
        sc[i].internal_set_zorder(i+1);
    }
    else
    {
      for (var i=z; i<c.zorder().z; ++i)
        sc[i].internal_set_zorder(i-1);
    }

    c.internal_set_zorder(z);
  };
  
  // fires the detached signal on this container and all its children
  //
  self.container__trigger_detached = function()
  {
    self.control__trigger_detached();
    self.each_child(function(c)
      {
        c.trigger_detached();
      });
  };
  
  // removes all of this container's children
  //
  self.container__remove_all = function()
  {
    while (children_.length > 0)
      self.remove_child(children_[0]);
  };
  
  // adds the given control 'c' to this container. 'w' is a value
  // that passed directly to the layout manager (such as the side
  // for a border_layout). This assumes 'c' currently has no parent.
  //
  self.container__add = function(c, w)
  {
    // c must be a valid control
    assert(c);
    assert(c.internal_is_a_control);

    // c must not have a parent
    assert(c.parent() == undefined);

    // can't add a container to itself nor create a loop
    assert(c != self);
    assert(!self.has_child(c));
    assert(!c.has_child(self));
    
    assert(c.internal_set_zorder != undefined);

    c.internal_set_parent(self);
    c.internal_set_zorder(children_.length);
    children_.push(c);

    c.zorder("top");

    layout_.add(c, w);
    
    self.relayout();
  };

  // layouts this container and all its children
  //  
  self.container__do_layout = function()
  {
    self.control__do_layout();
    layout_.layout(self);
    
    self.each_child(function(c)
      {
        c.do_layout();
      });
  };

  // returns the number of children in this container
  //
  self.container__children_count = function()
  {
    return children_.length;
  };

  // finds the control containing point 'p', relative to the parent;
  // this will go as deep as  possible
  //
  self.container__find_control = function(p, include_transparent)
  {
    // make lp relative to this container
    var lp = new point(
      p.x - self.position().x, p.y - self.position().y);
    
    // checking if the point is at least on this container
    if (self.control__find_control(p, true) != self)
      return undefined;
    
    // looking for a child that has the point
    var sc = sorted_children();
    for (var i in sc)
    {
      var c = sc[i].find_control(lp, include_transparent);
      if (c)
        return c;
    }

    // no child under the point, return this if not transparent
    if (include_transparent || !self.transparent())
      return self;

    return undefined;
  };

  // returns the control with the given id or undefined
  //
  self.container__find_id = function(id)
  {
    assert(id != undefined);

    var c = self.control__find_id(id);
    if (c != undefined)
      return c;

    var sc = sorted_children();
    for (var i in sc)
    {
      c = sc[i].find_id(id);
      if (c != undefined)
        return c;
    }

    return undefined;
  };
  
  // returns whether 'ct' is a child of this container; recursive
  //
  self.container__has_child = function(ct)
  {
    if (self.control__has_child(ct))
      return true;
    
    for (var i in children_)
    {
      if (children_[i].has_child(ct))
        return true;
    }
    
    return false;
  };
  
  // debug: returns this container's name
  //
  self.typename = function()
  {
    return "container";
  };
  
  // debug: dumps info about this container
  //
  self.container__dump = function(indent)
  {
    var s = self.control__dump(indent);
    
    s += "(" + layout_.dump() + ")";
    
    self.each_child(function(c)
      {
        s += "\n" + c.dump(indent+1);
      });
    
    return s;
  };
  
  init();

  
  // vtable
  self.is_dirty             = self.container__is_dirty;
  self.best_dimension       = self.container__best_dimension;
  self.draw                 = self.container__draw;
  self.layout               = self.container__layout;
  self.do_layout            = self.container__do_layout;
  self.internal_set_child_zorder = self.container__internal_set_child_zorder;
  self.remove_child         = self.container__remove_child;
  self.remove_all           = self.container__remove_all;
  self.trigger_detached     = self.container__trigger_detached;
  self.children_count       = self.container__children_count;
  self.find_id              = self.container__find_id;
  self.add                  = self.container__add;
  self.find_control         = self.container__find_control;
  self.has_child            = self.container__has_child;
  self.dump                 = self.container__dump;
},

// base class for a simple panel (basically, a container with a
// background); if the caption is set, it is displayed on the top of
// the panel and the top border (if any) is moved down in the middle
// of the caption.
//
inherit_basic_panel: function(self, opts)
{
  ui.inherit_container(self, opts);
  
  var caption_ = "";
  var caption_margin_ = 6;
  var caption_padding_ = 2;

  
  var init = function()
  {
    self.set_default_options({
      background: ui.theme.panel_color()
    });
  }

  // sets the caption if s is not undefined; in any case returns the
  // current caption
  //
  self.caption = function(s)
  {
    if (s != undefined)
    {
      caption_ = s;

      if (caption_ != "")
      {
        //todo
        self.force_padding(new dimension(2, g_line_height));
      }
      else
      {
        self.force_padding(0, 0);
      }

      self.redraw();
    }

    return caption_;
  }

  // makes it larger for the caption
  //
  self.best_dimension = function()
  {
    var bd = self.container__best_dimension();

    if (caption_ != "")
    {
      bd.w = Math.max(bd.w,
        caption_margin_*2 + caption_padding_*2 +
        text_dimension(caption_, self.font()).w);

      bd.h += g_line_height;
    }

    return bd;
  }

  // draws the background and defers to the container
  //
  self.basic_panel__draw = function(context)
  {
    var r = self.bounds();

    if (self.option("background").a !== 0.0)
      fill_rect(context, self.option("background"), r);

    if (caption_ != "")
    {
      cr = new rectangle(
        r.x + caption_margin_ + caption_padding_, r.y,
        text_dimension(caption_, self.font()).w, g_line_height);

      draw_text(
        context, caption_, new color().black(), cr, self.font());
    }

    self.container__draw(context);
  };

  
  self.draw_borders = function(context, bs, r)
  {
    if (caption_ != "")
    {
      r.y += g_line_height/2;
      r.h -= g_line_height/2;

      if (bs.top > 0)
      {
        fill_rect(
          context, new color().black(),
          new rectangle(r.x, r.y, caption_margin_, bs.top));

        var x =
          caption_margin_ + caption_padding_ +
          text_dimension(caption_, self.font()).w + caption_padding_;

        fill_rect(
          context, new color().black(),
          new rectangle(r.x + x, r.y, r.w - x, bs.top));

        bs.top = 0;
      }
    }

    self.control__draw_borders(context, bs, r);
  }
  
  // debug: returns this root panel's name
  //
  self.typename = function()
  {
    return "panel";
  };

  init();
  
  self.draw = self.basic_panel__draw;
}

});   // ui
