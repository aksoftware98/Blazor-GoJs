// This would be called by a razor page that contains myDiagramDiv via an
// JSRuntime.InvokeAsync<string>("initGoJS");
// In this project, Index.razor calls it from within OnAfterRender in Index.razor.cs
var myDiagram;

function initGoJS(keys, links) {
    var $ = go.GraphObject.make;  // for conciseness in defining templates

    myDiagram = $(go.Diagram, "myDiagramDiv",  // create a Diagram for the DIV HTML element
        {
            "undoManager.isEnabled": true, // enable undo & redo
            initialAutoScale: go.Diagram.Uniform,  // an initial automatic zoom-to-fit
            contentAlignment: go.Spot.Center,  // align document to the center of the viewport
            layout:
                $(ContinuousForceDirectedLayout,  // automatically spread nodes apart while dragging
                    { defaultSpringLength: 30, defaultElectricalCharge: 100 }),
            // do an extra layout at the end of a move
            "SelectionMoved": function (e) { e.diagram.layout.invalidateLayout(); },
        });

    // This is the actual HTML context menu:
    var cxElement = document.getElementById("contextMenu");

    // Since we have only one main element, we don't have to declare a hide method,
    // we can set mainElement and GoJS will hide it automatically
    var myContextMenu = $(go.HTMLInfo, {
        show: showContextMenu,
        hide: hideContextMenu
    });

    myDiagram.contextMenu = myContextMenu;

    myDiagram.addDiagramListener("ObjectSingleClicked",
        function (e) {
            var part = e.subject.part;
            if (!(part instanceof go.Link)) {
                DotNet.invokeMethod("GoJSDemo", "selectNode", part.data.key);
            }
        });

    myDiagram.addDiagramListener("ObjectContextClicked",
        function (e) {
            var part = e.subject.part;
            if (!(part instanceof go.Link)) {
                DotNet.invokeMethod("GoJSDemo", "selectNode", part.data.key);
            }
        });

    // dragging a node invalidates the Diagram.layout, causing a layout during the drag
    myDiagram.toolManager.draggingTool.doMouseMove = function () {
        go.DraggingTool.prototype.doMouseMove.call(this);
        if (this.isActive) { this.diagram.layout.invalidateLayout(); }
    }

    // define a simple Node template
    myDiagram.nodeTemplate =
        $(go.Node, "Auto",  // the Shape will go around the TextBlock
            //$(go.Shape, "RoundedRectangle", { strokeWidth: 0, fill: "white" },
            //    // Shape.fill is bound to Node.data.color
            //    new go.Binding("fill", "color")),
            $(go.Panel, "Table",
                $(go.Picture, { source: "images/1.svg", row: 0, column: 0, margin: 2, width: 50, height: 50 }, new go.Binding("source", "image"),
                    {
                        contextMenu: myContextMenu                         // define a context menu for each node
                        //$("ContextMenu",  // that has one button
                        //    $("ContextMenuButton",
                        //        {
                        //            "ButtonBorder.fill": "white",
                        //            "_buttonFillOver": "blue"
                        //        },
                        //        $(go.TextBlock, "Say Hi"),
                        //        { click: changeColor }))
                    }),
                $(go.TextBlock, { text: "Test", row: 1, column: 0, margin: 2, font: "14px arial", stroke: "blue" })
                //$(go.TextBlock,
                //    { margin: 8, font: "bold 14px sans-serif", stroke: '#333' }, // Specify a margin to add some room around the text
                //    // TextBlock.text is bound to Node.data.key
                //    new go.Binding("text", "key"))
            ));



    // We don't want the div acting as a context menu to have a (browser) context menu!
    cxElement.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        return false;
    }, false);

    function hideCX() {
        if (myDiagram.currentTool instanceof go.ContextMenuTool) {
            myDiagram.currentTool.doCancel();
        }
    }

    function showContextMenu(obj, diagram, tool) {
        // Show only the relevant buttons given the current state.
        var cmd = diagram.commandHandler;
        var hasMenuItem = false;
        function maybeShowItem(elt, pred) {
            if (pred) {
                elt.style.display = "block";
                hasMenuItem = true;
            } else {
                elt.style.display = "none";
            }
        }


        cxElement.classList.add("show-menu");
        // we don't bother overriding positionContextMenu, we just do it here:
        var mousePt = diagram.lastInput.viewPoint;
        cxElement.style.left = mousePt.x + 5 + "px";
        cxElement.style.top = mousePt.y + "px";


        // Optional: Use a `window` click listener with event capture to
        //           remove the context menu if the user clicks elsewhere on the page
        window.addEventListener("click", hideCX, true);
    }

    function hideContextMenu() {
        cxElement.classList.remove("show-menu");
        // Optional: Use a `window` click listener with event capture to
        //           remove the context menu if the user clicks elsewhere on the page
        window.removeEventListener("click", hideCX, true);
    }


    // This is the general menu command handler, parameterized by the name of the command.
    function cxcommand(event, val) {
        if (val === undefined) val = event.currentTarget.id;
        var diagram = myDiagram;
        switch (val) {
            case "cut": diagram.commandHandler.cutSelection(); break;
            case "copy": diagram.commandHandler.copySelection(); break;
            case "paste": diagram.commandHandler.pasteSelection(diagram.toolManager.contextMenuTool.mouseDownPoint); break;
            case "delete": diagram.commandHandler.deleteSelection(); break;
            case "color": {
                var color = window.getComputedStyle(event.target)['background-color'];
                changeColor(diagram, color); break;
            }
        }
        diagram.currentTool.stopTool();
    }

    myDiagram.linkTemplate =
        $(go.Link,  // the whole link panel
            {
                curve: go.Link.Bezier,
                adjusting: go.Link.Stretch,
                reshapable: true, relinkableFrom: true, relinkableTo: true,
                toShortLength: 10
            },
            $(go.Shape,  // the link shape
                { strokeWidth: 1.5, 'stroke': 'black' },
            ),
            $(go.Shape,  // the arrowhead
                { toArrow: "standard", stroke: null, fill: 'black' }));

    // but use the default Link template, by not setting Diagram.linkTemplate

    // create the model data that will be represented by Nodes and Links
    //myDiagram.model = new go.GraphLinksModel(
    //    [
    //        { key: "Alpha", color: "lightblue", image: "images/7.svg" },
    //        { key: "Beta", color: "orange", image: "images/6.svg" },
    //        { key: "Gamma", color: "lightgreen", image: "images/8.svg" },
    //        { key: "Delta", color: "pink", image: "images/9.svg" }
    //    ],
    //    [
    //        { from: "Alpha", to: "Beta" },
    //        { from: "Alpha", to: "Gamma" },
    //        { from: "Gamma", to: "Delta" },
    //        { from: "Delta", to: "Alpha" }
    //    ]);
    //alert(JSON.stringify(keys));
    //alert(JSON.stringify(links));
    myDiagram.model = new go.GraphLinksModel(
        keys, links);

    function cmCommand(e, obj) {
        var node = obj.part.adornedPart;  // the Node with the context menu
        var buttontext = obj.elt(1);  // the TextBlock
        alert(buttontext.text + " command on " + node.data.key);
    }

    function expandSelected(data, link) {
        alert(JSON.stringify(data));
        alert(JSON.stringify(link));
        var selectedNode = "";
        myDiagram.selection.each(function (n) {
            selectedNode = n.data.key;
        });

        var model = myDiagram.model;
        var newKey = selectedNode + (Math.floor(Math.random() * 100).toString());
        //model.addNodeData({
        //    "key": newKey,
        //    "color": "blue",
        //    "image": "images/" + (Math.floor(Math.random() * 9).toString()) + ".svg"
        //});
        //model.addLinkData({
        //    "from": selectedNode,
        //    "to": newKey
        //});
        model.addNodeDataCollection(data);
        model.addLinkDataCollection(link);
    }

    function expandNode(node) {
        var diagram = node.diagram;
        diagram.startTransaction("CollapseExpandTree");
        // this behavior is specific to this incrementalTree sample:
        var data = node.data;
        if (!data.everExpanded) {
            // only create children once per node
            diagram.model.setDataProperty(data, "everExpanded", true);
            var numchildren = createSubTree(data);
            if (numchildren === 0) {  // now known no children: don't need Button!
                node.findObject('TREEBUTTON').visible = false;
            }
        }
        // this behavior is generic for most expand/collapse tree buttons:
        if (node.isTreeExpanded) {
            diagram.commandHandler.collapseTree(node);
        } else {
            diagram.commandHandler.expandTree(node);
        }
        diagram.commitTransaction("CollapseExpandTree");
        myDiagram.zoomToFit();
    }

}

function initRadialJs(keys, links) {
    var layerThickness = 70;  // how thick each ring should be


    if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
    var $ = go.GraphObject.make;  // for conciseness in defining templates

    myDiagram =
        $(go.Diagram, "myDiagramDiv", // must be the ID or reference to div
            {
                initialAutoScale: go.Diagram.Uniform,
                isReadOnly: true,
                maxSelectionCount: 1,
                layout: $(RadialLayout, {
                    maxLayers: 5,
                    layerThickness: layerThickness,
                    rotateNode: function (node, angle, sweep, radius) {
                        // all nodes are centered at the origin
                        node.location = this.arrangementOrigin;
                        // because the Shape.geometry will be centered at the origin --
                        // see makeAnnularWedge, below
                        node.diagram.model.setDataProperty(node.data, "angle", angle);
                        node.diagram.model.setDataProperty(node.data, "sweep", sweep);
                        node.diagram.model.setDataProperty(node.data, "radius", radius);
                    }
                }),
                "animationManager.isEnabled": false
            });

    //var commonToolTip =
    //    $("ToolTip",
    //        $(go.Panel, "Vertical",
    //            { margin: 3 },
    //            $(go.TextBlock,  // bound to node data
    //                { margin: 4, font: "bold 12pt sans-serif" },
    //                new go.Binding("text")),
    //            $(go.TextBlock,  // bound to node data
    //                new go.Binding("text", "color", function (c) { return "Color: " + c; })),
    //            $(go.TextBlock,  // bound to Adornment because of call to Binding.ofObject
    //                new go.Binding("text", "", function (ad) { return "Connections: " + ad.adornedPart.linksConnected.count; }).ofObject())
    //        )  // end Vertical Panel
    //    );  // end Adornment

    // define the Node template
    myDiagram.nodeTemplate =
        $(go.Node, "Spot",
            {
                locationSpot: go.Spot.Center,
                selectionAdorned: false,
                mouseEnter: function (e, node) { node.layerName = "Foreground"; },
                mouseLeave: function (e, node) { node.layerName = ""; },
                click: nodeClicked,
                //toolTip: commonToolTip
            },
            $(go.Shape, // this always occupies the full circle
                { fill: "lightgray", strokeWidth: 0 },
                new go.Binding("geometry", "", makeAnnularWedge),
                new go.Binding("fill", "color")),
            $(go.TextBlock,
                { width: layerThickness, textAlign: "center" },
                new go.Binding("alignment", "", computeTextAlignment),
                new go.Binding("angle", "angle", ensureUpright),
                new go.Binding("text"))
        );

    function makeAnnularWedge(data) {
        var angle = data.angle;
        var sweep = data.sweep;
        var radius = data.radius;  // the inner radius
        if (angle === undefined || sweep === undefined || radius === undefined) return null;

        // the Geometry will be centered about (0,0)
        var outer = radius + layerThickness;  // the outer radius
        var inner = radius;
        var p = new go.Point(outer, 0).rotate(angle - sweep / 2);
        var q = new go.Point(inner, 0).rotate(angle + sweep / 2);
        var geo = new go.Geometry()
            .add(new go.PathFigure(-outer, -outer))  // always make sure the Geometry includes the top left corner
            .add(new go.PathFigure(outer, outer))    // and the bottom right corner of the whole circular area
            .add(new go.PathFigure(p.x, p.y)  // start at outer corner, go clockwise
                .add(new go.PathSegment(go.PathSegment.Arc, angle - sweep / 2, sweep, 0, 0, outer, outer))
                .add(new go.PathSegment(go.PathSegment.Line, q.x, q.y))  // to opposite inner corner, then anticlockwise
                .add(new go.PathSegment(go.PathSegment.Arc, angle + sweep / 2, -sweep, 0, 0, inner, inner).close()));
        return geo;
    }

    function computeTextAlignment(data) {
        var angle = data.angle;
        var radius = data.radius;
        if (angle === undefined || radius === undefined) return go.Spot.Center;
        var p = new go.Point(radius + layerThickness / 2, 0).rotate(angle);
        return new go.Spot(0.5, 0.5, p.x, p.y);
    }

    function ensureUpright(angle) {
        if (angle > 90 && angle < 270) return angle + 180;
        return angle;
    }

    // this is the root node, at the center of the circular layers
    myDiagram.nodeTemplateMap.add("Root",
        $(go.Node, "Auto",
            {
                locationSpot: go.Spot.Center,
                selectionAdorned: false,
                toolTip: commonToolTip,
                width: layerThickness * 2,
                height: layerThickness * 2
            },
            $(go.Shape, "Circle",
                { fill: "white", strokeWidth: 0.5, spot1: go.Spot.TopLeft, spot2: go.Spot.BottomRight }),
            $(go.TextBlock,
                { font: "bold 14pt sans-serif", textAlign: "center" },
                new go.Binding("text"))
        ));

    // define the Link template -- don't show anything!
    myDiagram.linkTemplate =
        $(go.Link);

    generateGraph(keys, links);


    function generateGraph(keys, links) {
       
        var nodeDataArray = keys;

        var linkDataArray = links; 

        myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);

        // layout based on a random person
        //var someone = nodeDataArray[Math.floor(Math.random() * nodeDataArray.length)];
        var someone = nodeDataArray[0];
        var somenode = myDiagram.findNodeForData(someone);
        nodeClicked(null, somenode);
    }

    function nodeClicked(e, root) {
        var diagram = root.diagram;
        if (diagram === null) return;
        // all other nodes should be visible and use the default category
        diagram.nodes.each(function (n) {
            n.visible = true;
            if (n !== root) n.category = "";
        })
        // make this Node the root
        root.category = "Root";
        // the root node always gets a full circle for itself, just in case the "Root"
        // template has any bindings using these properties
        diagram.model.setDataProperty(root.data, "angle", 0);
        diagram.model.setDataProperty(root.data, "sweep", 360);
        diagram.model.setDataProperty(root.data, "radius", 0);
        // tell the RadialLayout what the root node should be
        // setting this property will automatically invalidate the layout and then perform it again
        diagram.layout.root = root;
    }
}