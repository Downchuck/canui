// $Id$

namespace("ui", {

tree_parts:
{
  above:    0x01,
  below:    0x02,
  before:   0x04,
  toggle:   0x08,
  caption:  0x10,
  after:    0x20,
  nowhere:  0x40
},

tree_node: function(caption)
{
  var self = this;

  var tree_ = undefined;
  var parent_ = undefined;
  var caption_ = caption;
  var expanded_ = false;
  var children_ = [];
  var selected_ = false;

  self.internal_set_parent = function(p)
  {
    assert(parent_ == undefined);
    parent_ = p;
  }
  
  self.caption = function(c)
  {
    if (c != undefined)
    {
      caption_ = c;
      if (tree_ != undefined)
        tree_.redraw();
    }

    return caption_;
  };

  self.selected = function(b)
  {
    if (b != undefined)
    {
      if (selected_ != b)
      {
        if (tree_ != undefined)
          tree_.redraw();
      
        selected_ = b;
      }
    }

    return selected_;
  };

  self.expanded = function(b)
  {
    if (b != undefined)
    {
      if (expanded_ != b)
      {
        expanded_ = b;

        if (tree_ != undefined)
          tree_.internal_on_node_toggled();
      }
    }

    return expanded_;
  };

  self.internal_set_expanded_all = function(b)
  {
    expanded_ = b;
    self.each_node(function(n)
      {
        n.internal_set_expanded_all(b);
      });
  }

  self.expand_all = function()
  {
    self.internal_set_expanded_all(true);

    if (tree_ != undefined)
      tree_.internal_on_node_toggled();
  };

  self.collapse_all = function()
  {
    self.internal_set_expanded_all(false);

    if (tree_ != undefined)
      tree_.internal_on_node_toggled();
  };

  self.toggle = function()
  {
    return self.expanded(!expanded_);
  };

  self.add = function(n)
  {
    children_.push(n);
    n.internal_set_parent(self);

    if (tree_ != undefined)
      n.internal_set_tree(tree_);
  };

  self.internal_set_tree = function(t)
  {
    tree_ = t;
    self.each_node_recursive(function(n)
      {
        n.internal_set_tree(t);
      });
  };

  self.node = function(i)
  {
    assert(i >= 0 && i < children_.length);
    return children_[i];
  };

  self.node_count = function()
  {
    return children_.length;
  }

  self.each_node = function(f)
  {
    for (var i in children_)
      f(children_[i]);
  };

  self.each_node_recursive = function(f, indent)
  {
    if (indent == undefined)
      indent = 0;

    for (var i in children_)
    {
      f(children_[i], indent + 1);
      children_[i].each_node_recursive(f, indent + 1);
    }
  }
},


// options:
// item_height (positive integer), default: g_line_height+6
//   height in pixel of an item
//
// indent (positive integer), default: 19
//   width in pixels of the indent between a parent and a child node
//
// margin (positive integer), default: 5
//   size in pixels of the margin around the tree
//
// toggle_padding (positive integer), default: 0
//   width in pixels between the start of an item and the toggle image
//
// caption_padding (positive integer), default: 5
//   width in pixels between the toggle image and the caption
//
// multiple (true/false), default: false
//   whether multiple items can be selected
//
inherit_tree: function(self, opts)
{
  ui.inherit_container(self, merge(opts,
    {layout: new ui.absolute_layout()}));

  var root_ = new ui.tree_node("root");
  var minus_ = undefined;
  var plus_ = undefined;
  var hovered_ = undefined;
  var scroller_ = new ui.scroller({empty: true});
  var origin_ = new point(0, 0);
  var focus_ = undefined;

  var init = function()
  {
    self.set_default_options({
      item_height: g_line_height + 6,
      indent: 19,
      margin: 5,
      toggle_padding: 0,
      caption_padding: 5,
      multiple: false
    });

    root_.internal_set_tree(self);

    minus_ = load_image("minus.png", "-", mem_fun('redraw', self));
    plus_ = load_image("plus.png", "+", mem_fun('redraw', self));

    self.borders({all: 1});
    
    scroller_.vscroll.add(on_vscroll);
    self.add(scroller_);

    for (var i=0; i<2; ++i)
    {
      var n = new ui.tree_node("item" + i);
      for (var j=0; j<2; ++j)
      {
        var nn = new ui.tree_node("child" + j);
        for (var k=0; k<3; ++k)
        {
          var nnn = new ui.tree_node("cc" + k);
          for (var m=0; m<2; ++m)
            nnn.add(new ui.tree_node("dd" + m));

          nn.add(nnn);
        }

        n.add(nn);
      }
          
      root_.add(n);
    }

    root_.expand_all();
  };

  self.tree__best_dimension = function()
  {
    var d = tree_dimension();

    if (scroller_.vbar().visible())
      d.w += scroller_.vbar().best_dimension().w;

    return d;
  };

  // scrolls the tree
  //
  self.on_mouse_scroll = function(mp, delta)
  {
    if (scroller_.vbar().visible())
      scroller_.scroll_by(0, -delta * self.option("item_height"));

    return true;
  }

  self.internal_on_node_toggled = function()
  {
    set_scrollbars();
  };

  self.tree__on_bounds_changed = function()
  {
    scroller_.bounds(new rectangle(
      1, 1, self.width() - 2, self.height() - 2));

    set_scrollbars();
  };

  var set_scrollbars = function()
  {
    var td = tree_dimension();

    if (td.h > self.height())
    {
      scroller_.vbar().limits(0, td.h - self.height());
      scroller_.vbar().tick_size(self.option("item_height"));
    }
    else
    {
      scroller_.vbar().limits(0, 0);
    }
  };

  var tree_dimension = function()
  {
    var d = new dimension(0, 0);
    
    tree_dimension_impl(root_, d, 0);

    d.w += self.option("margin") * 2;
    d.h += self.option("margin") * 2;

    return d;
  };

  var tree_dimension_impl = function(node, d, indent)
  {
    var iw =
      indent * self.option("indent") +
      self.option("toggle_padding") + minus_.width() +
      self.option("caption_padding") +
      text_dimension(node.caption(), self.font()).w;

    d.w = Math.max(d.w, iw);
    d.h += self.option("item_height");

    if (node.expanded())
    {
      node.each_node(function(n)
        {
          tree_dimension_impl(n, d, indent + 1);
        });
    }
  };

  var on_vscroll = function(v)
  {
    origin_.y = -v;
  };

  self.tree__draw = function(context)
  {
    context.save();
    
    fill_rect(context, new color().white(), self.bounds());

    var r = new rectangle(
      self.position().x + self.option("margin"),
      self.position().y + self.option("margin"),
      0, 0);
    r.w = self.width() - r.x - self.option("margin");
    r.h = self.height() - r.y - self.option("margin");
    clip(context, self.bounds());

    draw_node(context, new point(r.x, r.y + origin_.y), root_, [], false);

    context.restore();
    self.container__draw(context);
  };
  
  var draw_node = function(context, op, node, indents, first_child, last_child)
  {
    var p = clone(op);

    p.x +=
      indents.length * self.option("indent") +
      self.option("toggle_padding");

    var has_child = node.node_count() > 0;
    var sign_y = p.y + self.option("item_height")/2 - minus_.height()/2;

    if (has_child)
    {
      if (node.expanded())
      {
        draw_image(context, minus_, new rectangle(
          p.x, sign_y, minus_.width(), minus_.height()));
      }
      else
      {
        draw_image(context, plus_, new rectangle(
          p.x, sign_y, plus_.width(), plus_.height()));
      }
    }

    draw_lines(
      context, clone(op), clone(p), has_child, last_child, indents);

    p.x += minus_.width() + self.option("caption_padding");

    var tc = ui.theme.text_color();
    var tr = new rectangle(
      p.x, p.y + self.option("item_height")/2 - g_line_height/2,
      text_dimension(node.caption(), self.font()).w, g_line_height);
    
    var sr = new rectangle(
      p.x - 2, p.y, tr.w + 4, self.option("item_height"));

    if (node.selected())
    {
      fill_rect(context, ui.theme.selected_text_background(), sr);
      tc = ui.theme.selected_text_color();
    }

    if (focus_ == node && self.option("multiple"))
    {
      var fc = undefined;
      if (node.selected())
        fc = color_inverse(ui.theme.selected_text_background());
      else
        fc = new color().black();

      draw_dotted_rect(context, fc, sr);
    }

    draw_text(context, node.caption(), tc, tr, self.font());

    if (node.expanded())
    {
      var ci = 0;
      node.each_node(function(n)
        {
          var first_child = (ci == 0);
          var last_child = (ci == (node.node_count() - 1));
  
          if (last_child)
            indents.push("none");
          else if (node.node_count() > 0)
            indents.push("with-sign");
          else
            indents.push("full");

          op.y += self.option("item_height");
          draw_node(context, op, n, indents, first_child, last_child);

          indents.pop();

          ++ci;
        });
    }

    p.x -= self.option("indent");
  };

  var draw_lines = function(context, op, p, has_child, last_child, indents)
  {
    // 'toggle' is the plus/minus image

    for (var i=0; i<indents.length; ++i)
    {
      // in the center of the toggle
      var x =
        op.x + ((i + 1) * self.option("indent")) + minus_.width()/2;

      var y=0, h=0;

      if (i == (indents.length - 1))
      { 
        // last line, the one next to the current node

        if (has_child)
        {
          // line will start right under the toggle
          var sign_y =
            p.y + self.option("item_height")/2 - minus_.height()/2;

          y = p.y;
          h = sign_y - y;
        }
        else
        {
          // line will start at the top of the item
          y = p.y;

          // the line will have the height of item, unless this is the
          // last item, in which case the line will stop in the middle
          if (last_child)
            h = self.option("item_height") / 2;
          else
            h = self.option("item_height");
        }
      }
      else
      {
        // an indent for a parent node

        if (indents[i] == "full")
        {
          // a full indent is the height of the item
          y = p.y;
          h = self.option("item_height");
        }
        else if (indents[i] == "with-sign")
        {
          // a 'with-sign' indent tells that the preceeding node
          // has a toggle, in which case the line needs to start a bit
          // higher than this node so it is right under the toggle

          // toggle y
          var sy = self.option("item_height")/2 - minus_.height()/2;

          y = p.y - sy;
          h = self.option("item_height") + sy;

          // the remaining nodes must display regular lines
          indents[i] = "full";
        }
      }

      draw_dotted_line(context, new color().black(),
        new rectangle(x, y, 1, h));
    }
  };

  self.tree__each_node = function(f)
  {
    f(root_, 0);
    root_.each_node_recursive(f, 0);
  };

  self.tree__select_only = function(s)
  {
    self.each_node(function(n)
      {
        if (n == s)
        {
          n.selected(true);
          focus_ = n;
        }
        else
        {
          n.selected(false);
        }
      });
  };

  self.tree__on_mouse_move = function(mp)
  {
    self.control__on_mouse_move(mp);

    var ht = self.hit_test(mp);

    hovered_ = ht.node;
    self.redraw();
  };

  self.tree__on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);
    
    var ht = self.hit_test(mp);
    if (ht.part & ui.tree_parts.toggle)
    {
      ht.node.toggle();
      self.redraw();
    }
    
    if (ht.node == undefined)
      return;

    if (!self.option("multiple"))
    {
      self.select_only(ht.node);
      return;
    }

    var rp = self.get_root_panel();

    if (rp.key_state(ui.key_codes.ctrl))
    {
      ht.node.selected(!ht.node.selected());
      focus_ = ht.node;
    }
    else
    {
      self.select_only(ht.node);
    }
  };

  self.tree__on_double_click = function(mp)
  {
    self.control__on_double_click(mp);

    var ht = self.hit_test(mp);
    if (ht.part & ui.tree_parts.caption)
    {
      ht.node.toggle();
      self.redraw();
    }
  };

  self.tree__hit_test = function(p)
  {
    var ht = {node: undefined, indent: -1, part: 0};

    p.y -= origin_.y;

    if (p.y < self.option("margin"))
    {
      ht.part |= ui.tree_parts.above;
    }
    else
    {
      var n = find_node_by_y(p.y, root_, new point(0, self.option("margin")), 0);
      if (n == undefined)
      {
        ht.part |= ui.tree_parts.below;
      }
      else
      {
        ht.node = n.node;
        ht.indent = n.indent;
      }
    }

    if (ht.node != undefined)
    {
      var ix =
        self.option("margin") + ht.indent * self.option("indent") +
        self.option("toggle_padding");

      if (p.x < ix)
      {
        ht.part |= ui.tree_parts.before;
      }
      else
      {
        ix += minus_.width();
        if (p.x < ix)
        {
          ht.part |= ui.tree_parts.toggle;
        }
        else
        {
          ix += self.option("caption_padding");
          if (p.x < ix)
          {
            ht.part |= ui.tree_parts.nowhere;
          }
          else
          {
            ix += text_dimension(ht.node.caption(), self.font()).w;
            if (p.x < ix)
            {
              ht.part |= ui.tree_parts.caption;
            }
            else
            {
              ht.part |= ui.tree_parts.after;
            }
          }
        }
      }
    }

    return ht;
  };

  var find_node_by_y = function(y, node, p, indent)
  {
    p.y += self.option("item_height");

    if (y < p.y)
      return {node: node, indent: indent};

    if (node.expanded())
    {
      for (var i=0; i<node.node_count(); ++i)
      {
        var n = node.node(i);

        var r = find_node_by_y(y, n, p, indent + 1);
        if (r != undefined)
          return r;
      }
    }

    return undefined;
  };

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "tree";
  }


  self.best_dimension       = self.tree__best_dimension;
  self.on_bounds_changed    = self.tree__on_bounds_changed;
  self.draw                 = self.tree__draw;
  self.each_node            = self.tree__each_node;
  self.select_only          = self.tree__select_only;
  self.on_mouse_move        = self.tree__on_mouse_move;
  self.on_mouse_left_down   = self.tree__on_mouse_left_down;
  self.hit_test             = self.tree__hit_test;
  self.on_double_click      = self.tree__on_double_click;

  init();
},

tree: function(opts)
{
  ui.inherit_tree(this, opts);
}

});   // namespace ui
