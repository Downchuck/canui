rem $Id$

@echo off

set compiler=D:\dev\cc\compiler.jar
set root=D:\dev\sites\canui\trunk

set src=%root%\src
set libs=%root%\libs
set out=%root%\src
set outfile=%out%\canui.js

if not exist %compiler% goto nocompiler
if not exist %src% goto nosrc
if not exist %libs% goto nolibs
if not exist %out% goto noout

echo Compiling...

java -jar %compiler% ^
  --js %libs%\jquery-1.5.1.min.js ^
  --js %libs%\jquery.mousewheel.min.js ^
  --js %libs%\namespace.js ^
  --js %src%\button.js ^
  --js %src%\combobox.js ^
  --js %src%\container.js ^
  --js %src%\control.js ^
  --js %src%\controls.js ^
  --js %src%\dialog.js ^
  --js %src%\geo.js ^
  --js %src%\graphics.js ^
  --js %src%\html.js ^
  --js %src%\image.js ^
  --js %src%\label.js ^
  --js %src%\layout.js ^
  --js %src%\list.js ^
  --js %src%\menu.js ^
  --js %src%\root_panel.js ^
  --js %src%\scroller.js ^
  --js %src%\slider.js ^
  --js %src%\textbox.js ^
  --js %src%\tree.js ^
  --js %src%\utility.js ^
  --js_output_file %outfile%

echo Done
exit

:nocompiler
echo The closure compiler wasn't found at %compiler%
echo Get it at https://code.google.com/p/closure-compiler/
echo.
exit

:nosrc
echo The src path %src% is invalid
echo.
exit

:nolibs
echo The libs path %libs% is invalid
echo.
exit

:noout
echo The out path %out% is invalid
echo.
exit
