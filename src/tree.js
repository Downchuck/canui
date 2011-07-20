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
      margin: 5
    });

    minus_ = load_image("minus.png", "-");
    plus_ = load_image("plus.png", "+");

    self.borders({all: 1});

    for (var i=0; i<5; ++i)
    {
      var n = new ui.tree_node("item" + i);
      for (var j=0; j<2; ++j)
        n.add(new ui.tree_node("child" + j));

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
      self.option("margin"), self.option("margin"));

    draw_node(context, p, root_);

    self.control__draw(context);
  };
  
  var draw_node = function(context, p, node)
  {
    draw_image(context, minus_, new rectangle(
      p.x, p.y + self.option("item_height")/2 - minus_.height()/2,
      0, 0));

    p.x += self.option("indent");

    draw_text(context, node.caption(), ui.theme.text_color(),
      new rectangle(p.x, p.y + self.option("item_height")/2 - g_line_height/2, 1000, 1000),
      self.font());

    node.each_child(function(n)
      {
        p.y += self.option("item_height");
        draw_node(context, p, n);
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
