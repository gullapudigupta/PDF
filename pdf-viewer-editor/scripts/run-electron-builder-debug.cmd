@echo off
setlocal
set DEBUG=electron-builder,electron-builder:*
node "node_modules/.pnpm/electron-builder@24.13.3_el_2d94b8d0e843602ee4381a4d0eb844a7/node_modules/electron-builder/cli.js" --win dir --config.electronDist=node_modules/electron/dist --config.directories.output=dist/electron-debug > electron-builder-nodecli.log 2>&1
echo %errorlevel% > .electron_build_exit_nodecli.txt
endlocal
