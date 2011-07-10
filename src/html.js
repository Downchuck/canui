// $Id$

namespace("ui", {

get_attr: function(e, name, def)
{
  var a = e.getAttribute(name);
  if (a == undefined || a == "")
    return def;
    
  return a;
},

get_data: function(e, name, def)
{
  var a = undefined;
  
  if (e.dataset != undefined)
    a = e.dataset[name];
  else
    a = e.getAttribute("data-" + name);
    
  if (a == undefined || a == "")
    return def;
    
  return a;
},

get_text: function(e)
{
  var s = "";
  for (var i=0; i<e.childNodes.length; ++i)
  {
    if (e.childNodes[i].nodeValue != undefined &&
        e.childNodes[i].nodeValue != "")
    {
      s += e.childNodes[i].nodeValue;
    }
  }
    
  return $.trim(s);
},

create_specific_ui: function(e, type)
{
  if (ui[type] == undefined)
  {
    throw "control type '" + type + "' doesn't exist";
  }
  else if (type == "root_panel")
  {
    var w = ui.get_attr(e, "width", 100);
    var h = ui.get_attr(e, "height", 100);
    
    var canvas = document.createElement("canvas");
    canvas.setAttribute("tabindex", "1");
    
    return new ui.root_panel(
      {canvas: $(canvas), dimension: new dimension(w, h)});
  }
  else
  {
    return new ui[type]();
  }
},

create_layout: function(c)
{
  var ly = eval(c);
  if (!ly.internal_is_a_layout)
    throw "'" + type + "' is not a layout";
  
  return ly;
},

create_ui: function(e)
{
  var type = ui.get_data(e, "type");
  var u = ui.create_specific_ui(e, type);
  
  u.id(ui.get_attr(e, "id", ""));

  var layout = ui.get_data(e, "layout");
  if (layout != undefined)
  {
    if (!u.internal_is_a_container)
    {
      throw "control '" + type + "' is not container, yet it has " +
            "a layout attribute";
    }
    
    u.layout(ui.create_layout(layout));
  }
  
  var caption = ui.get_text(e);
  if (caption != "")
  {
    if (u.caption == undefined)
    {
      throw "control '" + type + "' has inner text '" + caption +
            "' but doesn't have a caption() member function";
    }

    u.caption(caption);
  }
  
  var onclick = ui.get_attr(e, "onclick");
  if (onclick != undefined)
  {
    if (u.clicked == undefined || !u.clicked.internal_is_a_signal)
    {
      throw "control '" + type + "' has an onclick attribute but " +
            "doesn't have a 'clicked' signal";
    }
    
    u.clicked.add(eval(onclick));
  }
  
  var onchange = ui.get_attr(e, "onchange");
  if (onchange != undefined)
  {
    if (u.changed == undefined || !u.changed.internal_is_a_signal)
    {
      throw "control '" + type + "' has an onchange attribute but " +
            "doesn't have a 'changed' signal";
    }
    
    u.changed.add(eval(onchange));
  }

  var options = ui.get_data(e, "options");
  if (options != undefined)
    u.options(eval("(" + options + ")"));
  
  return u;
},

parse_impl: function(parent, node)
{
  for (var i=0; i<node.childNodes.length; ++i)
  {
    var e = node.childNodes[i];
    
    if (e.getAttribute == undefined)
      continue;
      
    var type = ui.get_data(e, "type");
    if (type == undefined)
      continue;
    
    if (type == "root_panel")
      throw "root_panel is specified twice";

    if (!parent.internal_is_a_container)
    {
      throw "control '" + parent.typename() + "' is not a " +
            "container, yet it has a nested element '" + type + "'";
    }
    
    var lyis = ui.get_data(e, "layout-info");
    var lyi = undefined;
    if (lyis != undefined)
      lyi = eval(lyis);

    var u = ui.create_ui(e, lyi);
    
    if (u.internal_is_a_menu && parent.internal_is_a_menu)
      parent.add_menu(u);
    else
      parent.add(u, lyi);
    
    ui.parse_impl(u, e);
  }
},

create_root_panel: function(r)
{
  var root = undefined;
  var rp = undefined;
  
  //try
  {
    for (var i=0; i<r.childNodes.length; ++i)
    {
      var e = r.childNodes[i];
      
      if (e.getAttribute == undefined)
        continue;
        
      var type = ui.get_data(e, "type");
      if (type == undefined)
        continue;
        
      if (type == "root_panel")
      {
        if (root != undefined)
          throw "root_panel is specified twice";
        
        rp = ui.create_ui(e);
        ui.parse_impl(rp, e);
      }
      else
      {
        throw "ui element '" + type + "' outside of root_panel";
      }
    }
    
    if (rp == undefined)
      throw "no root_panel element found";

    root = rp.canvas()[0];
  }
  /*catch(error)
  {
    var e = $(document.createElement("div"));
    e.attr("style", "font-size: 19px; font-weight: bold; color: red");
    e.text("canui: " + error);
    
    root = e[0];
  }*/

  r.parentNode.replaceChild(root, r);

  return rp;
}

});   // namespace ui