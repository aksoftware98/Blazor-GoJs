using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace GoJSDemo.Models
{
    public class DiagramNode
    {
        [JsonPropertyName("key")]
        public string Key { get; set; }

        [JsonPropertyName("image")]
        public string Icon { get; set; }

        [JsonPropertyName("borderColor")]
        public string BorderColor { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; }

        public List<DiagramNode> Children { get; set; }

        public DiagramNode ParentNode { get; set; }

        public DiagramNode()
        {
            Children = new List<DiagramNode>();
        }
    }

    public class Diagram
    {
        public List<DiagramNode> Nodes { get; set; }

        public Diagram()
        {
            Nodes = new List<DiagramNode>();
        }

        public (object, object) GetGoJsRepresentation()
        {
            List<Link> links = new List<Link>();

            var nodes = GetDiagramNode(null, Nodes);

            foreach (var item in nodes)
            {
                Console.WriteLine($"{item.Key} - Parent {item.ParentNode?.Key}");
            }
            
            links = nodes.Where(n => n.ParentNode != null).Select(i => new Link { From = i.ParentNode.Key, To = i.Key }).ToList();
            
            foreach (var item in links)
            {
                Console.WriteLine($"From: {item.From} | To: {item.To}");
            }

            return (nodes.Select(n => new { key = n.Key, image = n.Icon }).ToArray(), links.Select(l => new { from = l.From, to = l.To}).ToArray());
        }

        public List<DiagramNode> GetDiagramNode(DiagramNode node, List<DiagramNode> nodes)
        {
            List<DiagramNode> currentNodes = nodes.ToList();
            foreach (var item in nodes)
            {
                item.ParentNode = node; 
                if (item.Children.Any())
                    currentNodes.AddRange(GetDiagramNode(item, item.Children));
            }

            return currentNodes;
        }
    }

    public class Link
    {
        [JsonPropertyName("from")]
        public string From { get; set; }

        [JsonPropertyName("to")]
        public string To { get; set; }
    }
}
