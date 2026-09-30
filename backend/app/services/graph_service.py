from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.case import Case, CasePerson
from app.models.person import Person
from app.models.evidence import Evidence
from app.models.vehicle import Vehicle
from app.models.location import Location
from app.models.relationship import Relationship
from app.schemas.graph import GraphNode, GraphEdge, GraphResponse


class GraphService:
    @staticmethod
    def get_case_graph(db: Session, case_id: UUID) -> GraphResponse:
        """
        Build an interactive knowledge graph for a given investigation case.
        Nodes: CASE, PERSON, EVIDENCE, VEHICLE, LOCATION, CALL, TRANSACTION, INCIDENT.
        Edges: KNOWN_ASSOCIATE, COMMUNICATION, TRANSACTION, SEEN_WITH, OWNS, LOCATED_AT, LINKED_TO_CASE, EVIDENCE_SUPPORTS, VEHICLE_APPEARANCE.
        """
        case = db.query(Case).filter(Case.case_id == case_id).first()
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        node_ids = set()

        if case:
            # 1. Root Case Node
            case_node_id = f"case-{case.case_id}"
            nodes.append(GraphNode(
                id=case_node_id,
                label=case.case_number,
                type="CASE",
                subLabel=case.title,
                size=32,
                confidence=1.0,
                x=400.0,
                y=250.0
            ))
            node_ids.add(case_node_id)

            # 2. Case Persons
            case_persons = (
                db.query(CasePerson, Person)
                .join(Person, CasePerson.person_id == Person.person_id)
                .filter(CasePerson.case_id == case_id)
                .all()
            )

            import math
            p_count = len(case_persons)
            for idx, (cp, person) in enumerate(case_persons):
                angle = (2 * math.pi * idx) / max(p_count, 1)
                px = 400.0 + 180.0 * math.cos(angle)
                py = 250.0 + 180.0 * math.sin(angle)

                person_node_id = f"person-{person.person_id}"
                if person_node_id not in node_ids:
                    nodes.append(GraphNode(
                        id=person_node_id,
                        label=person.full_name,
                        type="PERSON",
                        subLabel=f"Role: {cp.relationship_type.replace('_', ' ').capitalize()}",
                        size=24,
                        isAiInferred=False,
                        confidence=1.0,
                        x=px,
                        y=py,
                        metadata={"risk_level": person.risk_level, "aliases": person.aliases}
                    ))
                    node_ids.add(person_node_id)

                # Edge from Person to Case
                edges.append(GraphEdge(
                    id=f"edge-cp-{cp.case_person_id}",
                    source=person_node_id,
                    target=case_node_id,
                    relationship="LINKED_TO_CASE",
                    confidence=1.0,
                    isAiInferred=False
                ))

            # 3. Evidence Nodes
            evidence_records = db.query(Evidence).filter(Evidence.case_id == case_id).limit(10).all()
            for idx, ev in enumerate(evidence_records):
                ev_node_id = f"ev-{ev.evidence_id}"
                ex = 400.0 + 260.0 * math.cos(idx * 0.6)
                ey = 250.0 + 260.0 * math.sin(idx * 0.6)

                if ev_node_id not in node_ids:
                    nodes.append(GraphNode(
                        id=ev_node_id,
                        label=ev.title[:20],
                        type="EVIDENCE",
                        subLabel=ev.evidence_type,
                        size=18,
                        confidence=0.95,
                        x=ex,
                        y=ey
                    ))
                    node_ids.add(ev_node_id)

                edges.append(GraphEdge(
                    id=f"edge-ev-{ev.evidence_id}",
                    source=ev_node_id,
                    target=case_node_id,
                    relationship="EVIDENCE_SUPPORTS",
                    confidence=0.95
                ))

            # 4. Graph Relationships between entities
            relationships = (
                db.query(Relationship)
                .filter(
                    Relationship.source_entity_type.in_(["PERSON", "CASE", "VEHICLE"]),
                    Relationship.target_entity_type.in_(["PERSON", "CASE", "VEHICLE", "LOCATION"])
                )
                .limit(25)
                .all()
            )

            for rel in relationships:
                s_id = f"{rel.source_entity_type.lower()}-{rel.source_entity_id}"
                t_id = f"{rel.target_entity_type.lower()}-{rel.target_entity_id}"
                if s_id in node_ids and t_id in node_ids:
                    edges.append(GraphEdge(
                        id=f"rel-{rel.relationship_id}",
                        source=s_id,
                        target=t_id,
                        relationship=rel.relationship_type,
                        confidence=float(rel.confidence),
                        isAiInferred=float(rel.confidence) < 0.95
                    ))

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            case_id=str(case_id),
            total_nodes=len(nodes),
            total_edges=len(edges)
        )

    @staticmethod
    def get_person_connections(db: Session, person_id: UUID) -> GraphResponse:
        """Fetch 1-hop and 2-hop connected network for a specific person."""
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        node_ids = set()

        person = db.query(Person).filter(Person.person_id == person_id).first()
        if not person:
            return GraphResponse(nodes=[], edges=[], total_nodes=0, total_edges=0)

        # Center root node
        root_id = f"person-{person.person_id}"
        nodes.append(GraphNode(
            id=root_id,
            label=person.full_name,
            type="PERSON",
            subLabel="Subject Profile",
            size=28,
            confidence=1.0,
            x=400.0,
            y=250.0
        ))
        node_ids.add(root_id)

        # Linked relationships
        rels = (
            db.query(Relationship)
            .filter(
                (Relationship.source_entity_id == person_id) |
                (Relationship.target_entity_id == person_id)
            )
            .limit(20)
            .all()
        )

        import math
        for idx, r in enumerate(rels):
            is_source = r.source_entity_id == person_id
            target_type = r.target_entity_type if is_source else r.source_entity_type
            target_id_raw = r.target_entity_id if is_source else r.source_entity_id
            target_node_id = f"{target_type.lower()}-{target_id_raw}"

            angle = (2 * math.pi * idx) / max(len(rels), 1)
            nx = 400.0 + 190.0 * math.cos(angle)
            ny = 250.0 + 190.0 * math.sin(angle)

            if target_node_id not in node_ids:
                nodes.append(GraphNode(
                    id=target_node_id,
                    label=f"{target_type} #{str(target_id_raw)[:6]}",
                    type=target_type,
                    size=20,
                    x=nx,
                    y=ny
                ))
                node_ids.add(target_node_id)

            edges.append(GraphEdge(
                id=f"edge-{r.relationship_id}",
                source=root_id if is_source else target_node_id,
                target=target_node_id if is_source else root_id,
                relationship=r.relationship_type,
                confidence=float(r.confidence)
            ))

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges)
        )
