// $Id$

namespace("ui", {

tree_node: function(caption)
{
  var self = this;

  var tree_ = undefined;
  var caption_ = caption;
  var children_ = [];

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

  self.add = function(n)
  {
    children_.push(n);
  };

  self.child_count = function()
  {
    return children_.length;
  }

  self.each_child = function(f)
  {
    for (var i in children_)
      f(children_[i]);
  };
},

inherit_tree: function(self, opts)
{
  ui.inherit_control(self, opts);

  var root_ = new ui.tree_node("root");
  var minus_ = undefined;
  var plus_ = undefined;

  var init = function()
  {
    self.set_default_options({
      item_height: g_line_height + 6,
      indent: 19,
      margin: 5,
      padding: 12
    });

    minus_ = load_image("minus.png", "-", mem_fun('redraw', self));
    plus_ = load_image("plus.png", "+", mem_fun('redraw', self));

    self.borders({all: 1});

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
  };

  self.tree__best_dimension = function()
  {
    //todo
    return new dimension(100, 100);
  };

  self.tree__draw = function(context)
  {
    fill_rect(context, new color().white(), self.bounds());

    var p = new point(
      self.position().x + self.option("margin"),
      self.position().y + self.option("margin"));

    draw_node(context, p, root_, [], false);

    self.control__draw(context);
  };
  
  var draw_node = function(context, op, node, indents, first_child, last_child)
  {
    var p = clone(op);

    p.x += indents.length * self.option("indent");

    var has_child = node.child_count() > 0;
    var sign_y = p.y + self.option("item_height")/2 - minus_.height()/2;

    if (has_child)
    {
      draw_image(context, minus_, new rectangle(
        p.x, sign_y, 0, 0));
    }

    for (var i=0; i<indents.length; ++i)
    {
      var x = op.x + ((i + 1) * self.option("indent")) + minus_.width()/2;
      var y=0, h=0;

      var last = (indents.length - 1);

      if (i == last)
      {
        if (has_child)
        {
          y = p.y;
          h = sign_y - y;
        }
        else
        {
          y = p.y;

          if (last_child)
            h = self.option("item_height") / 2;
          else
            h = self.option("item_height");
        }
      }
      else
      {
        if (indents[i] == 1)
        {
          y = p.y;
          h = self.option("item_height");
        }
        else if (indents[i] == 2)
        {
          var sy = self.option("item_height")/2 + minus_.height()/2;
          y = p.y - sy;
          h = self.option("item_height") + sy;
          indents[i] = 1;
        }
      }

      draw_dotted_line(context, new color().black(),
        new rectangle(x, y, 1, h));
    }

    p.x += self.option("padding");

    draw_text(context, node.caption(), ui.theme.text_color(),
      new rectangle(p.x, p.y + self.option("item_height")/2 - g_line_height/2, 1000, 1000),
      self.font());

    var ci = 0;
    node.each_child(function(n)
      {
        var first_child = (ci == 0);
        var last_child = (ci == (node.child_count() - 1));
  
        if (first_child)
          indents.push(2);
        else if (last_child)
          indents.push(0);
        else
          indents.push(1);

        op.y += self.option("item_height");
        draw_node(context, op, n, indents, first_child, last_child);

        indents.pop();

        ++ci;
      });

    p.x -= self.option("indent");
  };


  self.best_dimension   = self.tree__best_dimension;
  self.draw             = self.tree__draw;

  init();
},

tree: function(opts)
{
  ui.inherit_tree(this, opts);
}

});   // namespace ui
