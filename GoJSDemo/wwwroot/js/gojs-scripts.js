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

    myDiagram.addDiagramListener("ObjectSingleClicked",
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
            $(go.Picture, { source: "images/1.svg", column: 0, margin: 2, width: 50, height: 50 }, new go.Binding("source", "image"),
                {
                    contextMenu:                            // define a context menu for each node
                        $("ContextMenu", "Spot",              // that has several buttons around
                            $(go.Placeholder, { padding: 5 }),  // a Placeholder object
                            $("ContextMenuButton", $(go.TextBlock, "Right"),
                                { alignment: go.Spot.Right, alignmentFocus: go.Spot.Right, click: cmCommand })
                        )  // end Adornment
                }),
            //$(go.TextBlock,
            //    { margin: 8, font: "bold 14px sans-serif", stroke: '#333' }, // Specify a margin to add some room around the text
            //    // TextBlock.text is bound to Node.data.key
            //    new go.Binding("text", "key"))
        );

    myDiagram.linkTemplate =
        $(go.Link,  // the whole link panel
            {
                curve: go.Link.Bezier,
                adjusting: go.Link.Stretch,
                reshapable: true, relinkableFrom: true, relinkableTo: true,
                toShortLength: 3
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

// This dynamically creates the immediate children for a node.
// The sample assumes that we have no idea of whether there are any children
// for a node until we look for them the first time, which happens
// upon the first tree-expand of a node.
function createSubTree(parentdata) {
    var numchildren = Math.floor(Math.random() * 10);
    if (myDiagram.nodes.count <= 1) {
        numchildren += 1;  // make sure the root node has at least one child
    }
    // create several node data objects and add them to the model
    var model = myDiagram.model;
    var parent = myDiagram.findNodeForData(parentdata);

    var degrees = 1;
    var grandparent = parent.findTreeParentNode();
    while (grandparent) {
        degrees++;
        grandparent = grandparent.findTreeParentNode();
    }

    for (var i = 0; i < numchildren; i++) {
        var childdata = {
            key: model.nodeDataArray.length,
            parent: parentdata.key,
            rootdistance: degrees,
            image: "images/7.svg",
        };
        // add to model.nodeDataArray and create a Node
        model.addNodeData(childdata);
        // position the new child node close to the parent
        var child = myDiagram.findNodeForData(childdata);
        child.location = parent.location;
    }
    return numchildren;
}



function expandAtRandom() {
    var eligibleNodes = [];
    myDiagram.nodes.each(function (n) {
        if (!n.isTreeExpanded) eligibleNodes.push(n);
    })
    var node = eligibleNodes[Math.floor(Math.random() * (eligibleNodes.length))];
    expandNode(node);
}

function ContinuousForceDirectedLayout() {
    go.ForceDirectedLayout.call(this);
    this._isObserving = false;
}
go.Diagram.inherit(ContinuousForceDirectedLayout, go.ForceDirectedLayout);

ContinuousForceDirectedLayout.prototype.isFixed = function (v) {
    return v.node.isSelected;
}

// optimization: reuse the ForceDirectedNetwork rather than re-create it each time
ContinuousForceDirectedLayout.prototype.doLayout = function (coll) {
    if (!this._isObserving) {
        this._isObserving = true;
        // cacheing the network means we need to recreate it if nodes or links have been added or removed or relinked,
        // so we need to track structural model changes to discard the saved network.
        var lay = this;
        this.diagram.addModelChangedListener(function (e) {
            // modelChanges include a few cases that we don't actually care about, such as
            // "nodeCategory" or "linkToPortId", but we'll go ahead and recreate the network anyway.
            // Also clear the network when replacing the model.
            if (e.modelChange !== "" ||
                (e.change === go.ChangedEvent.Transaction && e.propertyName === "StartingFirstTransaction")) {
                lay.network = null;
            }
        });
    }
    var net = this.network;
    if (net === null) {  // the first time, just create the network as normal
        this.network = net = this.makeNetwork(coll);
    } else {  // but on reuse we need to update the LayoutVertex.bounds for selected nodes
        this.diagram.nodes.each(function (n) {
            var v = net.findVertex(n);
            if (v !== null) v.bounds = n.actualBounds;
        });
    }
    // now perform the normal layout
    go.ForceDirectedLayout.prototype.doLayout.call(this, coll);
    // doLayout normally discards the LayoutNetwork by setting Layout.network to null;
    // here we remember it for next time
    this.network = net;
}