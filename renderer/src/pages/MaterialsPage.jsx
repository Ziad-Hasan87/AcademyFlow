import { useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiFolder,
  FiSettings,
} from "react-icons/fi";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission } from "../utils/types";

function formatEventDate(dateValue) {
  if (!dateValue) return "No Date";

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return String(dateValue);

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTeacherHierarchy(materialRows) {
  const programMap = new Map();

  materialRows.forEach((row) => {
    const programName = row.program_name || "Unknown Program";
    const operationName = row.operation_name || "Unknown Operation";
    const courseName = row.course_name || "Unknown Course";
    const eventTitle = row.event_title || "Untitled Event";
    const eventDate = formatEventDate(row.event_date);
    const eventKey = `${eventTitle}-${eventDate}`;

    if (!programMap.has(programName)) {
      programMap.set(programName, new Map());
    }

    const operationMap = programMap.get(programName);
    if (!operationMap.has(operationName)) {
      operationMap.set(operationName, new Map());
    }

    const courseMap = operationMap.get(operationName);
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, new Map());
    }

    const eventMap = courseMap.get(courseName);
    if (!eventMap.has(eventKey)) {
      eventMap.set(eventKey, {
        title: eventTitle,
        date: eventDate,
        attachments: [],
      });
    }

    eventMap.get(eventKey).attachments.push({
      id: row.attachment_id,
      name: row.file_name || row.file_path?.split("/").pop() || "Attachment",
      path: row.file_path,
      availableAt: row.available_at,
    });
  });

  return Array.from(programMap.entries()).map(([programName, operationMap]) => ({
    name: programName,
    operations: Array.from(operationMap.entries()).map(([operationName, courseMap]) => ({
      name: operationName,
      courses: Array.from(courseMap.entries()).map(([courseName, eventMap]) => ({
        name: courseName,
        events: Array.from(eventMap.values()),
      })),
    })),
  }));
}

function buildStudentHierarchy(materialRows) {
  const operationMap = new Map();

  materialRows.forEach((row) => {
    const operationName = row.operation_name || "Unknown Operation";
    const courseName = row.course_name || "Unknown Course";
    const eventTitle = row.event_title || "Untitled Event";
    const eventDate = formatEventDate(row.event_date);
    const eventKey = `${eventTitle}-${eventDate}`;

    if (!operationMap.has(operationName)) {
      operationMap.set(operationName, new Map());
    }

    const courseMap = operationMap.get(operationName);
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, new Map());
    }

    const eventMap = courseMap.get(courseName);
    if (!eventMap.has(eventKey)) {
      eventMap.set(eventKey, {
        title: eventTitle,
        date: eventDate,
        attachments: [],
      });
    }

    eventMap.get(eventKey).attachments.push({
      id: row.attachment_id,
      name: row.file_name || row.file_path?.split("/").pop() || "Attachment",
      path: row.file_path,
      availableAt: row.available_at,
    });
  });

  return Array.from(operationMap.entries()).map(([operationName, courseMap]) => ({
    name: operationName,
    courses: Array.from(courseMap.entries()).map(([courseName, eventMap]) => ({
      name: courseName,
      events: Array.from(eventMap.values()),
    })),
  }));
}

function buildExplorerTree(materials, isStudent) {
  if (isStudent) {
    return materials.map((operationNode, operationIndex) => ({
      id: `operation-${operationIndex}-${operationNode.name}`,
      label: operationNode.name,
      type: "operation",
      children: (operationNode.courses || []).map((courseNode, courseIndex) => ({
        id: `operation-${operationIndex}-${operationNode.name}-course-${courseIndex}-${courseNode.name}`,
        label: courseNode.name,
        type: "course",
        children: (courseNode.events || []).map((eventNode, eventIndex) => ({
          id: `operation-${operationIndex}-${operationNode.name}-course-${courseIndex}-${courseNode.name}-event-${eventIndex}-${eventNode.title}-${eventNode.date}`,
          label: `${eventNode.title} - ${eventNode.date}`,
          type: "event",
          attachments: eventNode.attachments || [],
          children: [],
        })),
      })),
    }));
  }

  return materials.map((programNode, programIndex) => ({
    id: `program-${programIndex}-${programNode.name}`,
    label: programNode.name,
    type: "program",
    children: (programNode.operations || []).map((operationNode, operationIndex) => ({
      id: `program-${programIndex}-${programNode.name}-operation-${operationIndex}-${operationNode.name}`,
      label: operationNode.name,
      type: "operation",
      children: (operationNode.courses || []).map((courseNode, courseIndex) => ({
        id: `program-${programIndex}-${programNode.name}-operation-${operationIndex}-${operationNode.name}-course-${courseIndex}-${courseNode.name}`,
        label: courseNode.name,
        type: "course",
        children: (courseNode.events || []).map((eventNode, eventIndex) => ({
          id: `program-${programIndex}-${programNode.name}-operation-${operationIndex}-${operationNode.name}-course-${courseIndex}-${courseNode.name}-event-${eventIndex}-${eventNode.title}-${eventNode.date}`,
          label: `${eventNode.title} - ${eventNode.date}`,
          type: "event",
          attachments: eventNode.attachments || [],
          children: [],
        })),
      })),
    })),
  }));
}

function collectAttachments(node) {
  if (!node) return [];

  if (node.type === "event") {
    return node.attachments || [];
  }

  const fromChildren = (node.children || []).flatMap((child) => collectAttachments(child));
  const dedupedMap = new Map();
  fromChildren.forEach((item) => {
    if (!dedupedMap.has(item.id)) {
      dedupedMap.set(item.id, item);
    }
  });

  return Array.from(dedupedMap.values());
}

function flattenTree(nodes, parentPath = [], result = []) {
  nodes.forEach((node) => {
    const currentPath = [...parentPath, node.label];
    result.push({ id: node.id, node, path: currentPath });
    flattenTree(node.children || [], currentPath, result);
  });
  return result;
}

function formatDateTime(value) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function MaterialsPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [materials, setMaterials] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");

  const role = userData?.role;
  const instituteId = userData?.institute_id;
  const userId = userData?.id;

  const canUseTeacherStructure = hasPermission(role, "Teacher");
  const isStudent = role === "Student";

  const loadMaterials = async () => {
    if (!instituteId || !userId) {
      setMaterials([]);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      let studentProgramId = null;

      if (isStudent) {
        const { data: profileData, error: profileError } = await supabase.rpc("get_user_profile_ids", {
          p_user_id: userId,
        });

        if (profileError) throw profileError;

        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        studentProgramId = profile?.program_id;

        if (!studentProgramId) {
          setMaterials([]);
          setLoading(false);
          return;
        }
      }

      if (!isStudent && !canUseTeacherStructure) {
        setMaterials([]);
        setLoading(false);
        return;
      }

      let attachmentsQuery = supabase
        .from("attachments")
        .select(`
          id,
          file_name,
          file_path,
          available_at,
          event_id,
          events!inner(
            id,
            title,
            date,
            course_id,
            courses!inner(
              id,
              name,
              operations!inner(
                id,
                name,
                programs!inner(
                  id,
                  name,
                  institution_id
                )
              )
            )
          )
        `);

      if (isStudent) {
        attachmentsQuery = attachmentsQuery.eq("events.courses.operations.program_id", studentProgramId);
      } else {
        attachmentsQuery = attachmentsQuery.eq("events.courses.operations.programs.institution_id", instituteId);
      }

      const { data: scopedAttachments, error: scopedAttachmentsError } = await attachmentsQuery;

      if (scopedAttachmentsError) throw scopedAttachmentsError;

      const flatRows = (scopedAttachments || [])
        .filter((row) => row?.events?.courses)
        .map((row) => {
          const event = row.events;
          const course = event.courses;
          const operation = course.operations;
          const program = operation?.programs;

          return {
            attachment_id: row.id,
            file_name: row.file_name,
            file_path: row.file_path,
            available_at: row.available_at,
            event_id: event.id,
            event_title: event.title,
            event_date: event.date,
            course_id: course.id,
            course_name: course.name,
            operation_name: operation?.name || null,
            program_id: program?.id || null,
            program_name: program?.name || null,
            institution_id: program?.institution_id || null,
          };
        })
        .filter((row) => (isStudent ? true : row.institution_id === instituteId));

      if (isStudent) {
        setMaterials(buildStudentHierarchy(flatRows));
      } else {
        setMaterials(buildTeacherHierarchy(flatRows));
      }
    } catch (error) {
      console.error("Error loading materials:", error);
      setErrorMessage(error?.message || "Failed to load materials.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [instituteId, role, userId]);

  const explorerTree = useMemo(() => buildExplorerTree(materials, isStudent), [materials, isStudent]);

  const flattenedNodes = useMemo(() => flattenTree(explorerTree), [explorerTree]);

  const nodeById = useMemo(() => {
    const map = new Map();
    flattenedNodes.forEach((entry) => {
      map.set(entry.id, entry);
    });
    return map;
  }, [flattenedNodes]);

  useEffect(() => {
    if (flattenedNodes.length === 0) {
      setSelectedNodeId("");
      return;
    }

    if (!selectedNodeId || !nodeById.has(selectedNodeId)) {
      setSelectedNodeId(flattenedNodes[0].id);
    }
  }, [flattenedNodes, selectedNodeId, nodeById]);

  const totalAttachmentCount = useMemo(() => {
    return explorerTree.reduce(
      (sum, node) => sum + collectAttachments(node).length,
      0
    );
  }, [explorerTree]);

  const selectedEntry = selectedNodeId ? nodeById.get(selectedNodeId) : null;
  const selectedNode = selectedEntry?.node || null;
  const selectedPath = selectedEntry?.path || [];
  const visibleItems = useMemo(() => {
    if (!selectedNode) return [];

    if (selectedNode.type === "event") {
      return (selectedNode.attachments || []).map((attachment) => ({
        id: `file-${attachment.id}`,
        kind: "file",
        name: attachment.name,
        date: formatDateTime(attachment.availableAt),
        actionLabel: "Download",
        attachment,
      }));
    }

    return (selectedNode.children || []).map((child) => ({
      id: `folder-${child.id}`,
      kind: "folder",
      name: child.label,
      date: "-",
      actionLabel: "Open",
      childId: child.id,
    }));
  }, [selectedNode]);

  const downloadAttachment = async (filePath, fileName) => {
    if (!filePath) return;

    const { data, error } = await supabase.storage.from("attachments").download(filePath);
    if (error) {
      alert("Failed to download material.");
      return;
    }

    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || "attachment";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="materials-finder-shell">
      <div className="materials-finder-window materials-file-manager-layout">
        <div className="materials-file-manager-pane materials-finder-sidebar">
          <div className="materials-pane-header">
            <div className="materials-pane-title">
              <FiFolder size={18} />
              <span>My Files</span>
            </div>
            <button type="button" className="materials-pane-icon-btn" aria-label="Settings" title="Settings">
              <FiSettings size={15} />
            </button>
          </div>

          {explorerTree.length === 0 && !loading && !errorMessage && (
            <div className="materials-finder-empty">No folders found</div>
          )}

          <ul className="materials-tree-root">
            {explorerTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                selectedNodeId={selectedNodeId}
                onSelect={setSelectedNodeId}
              />
            ))}
          </ul>
        </div>

        <section className="materials-file-manager-pane materials-finder-main">
          <div className="materials-pane-header">
            <div className="materials-pane-title">
              <FiFolder size={18} />
              <span>{selectedPath[selectedPath.length - 1] || "My Files"}</span>
            </div>
            <div className="materials-pane-subtitle">{selectedPath.join(" / ") || "No folder selected"}</div>
          </div>

          <div className="materials-finder-status-row">
            <span>
              {isStudent
                ? "Operation / Course / Event-Date / Attachments"
                : "Program / Operation / Course / Event-Date / Attachments"}
            </span>
            <div className="materials-status-actions">
              <span>{totalAttachmentCount} total files</span>
              <button type="button" className="materials-inline-refresh" onClick={loadMaterials}>
                Refresh
              </button>
            </div>
          </div>

          {loading && <div className="materials-finder-placeholder">Loading materials...</div>}
          {!loading && errorMessage && <div className="materials-finder-error">{errorMessage}</div>}
          {!loading && !errorMessage && visibleItems.length === 0 && (
            <div className="materials-finder-placeholder">This folder has no files.</div>
          )}

          {!loading && !errorMessage && visibleItems.length > 0 && (
            <div className="materials-files-table-wrap">
              <table className="materials-files-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="materials-file-name" title={item.name}>
                          {item.kind === "folder" ? <FiFolder size={14} /> : <FiFileText size={14} />}
                          {item.name}
                        </span>
                      </td>
                      <td>{item.kind === "folder" ? "Folder" : "File"}</td>
                      <td>{item.date}</td>
                      <td>
                        {item.kind === "file" ? (
                          <button
                            type="button"
                            className="materials-file-download"
                            onClick={() => downloadAttachment(item.attachment.path, item.attachment.name)}
                          >
                            <FiDownload size={14} />
                            Download
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="materials-file-open"
                            onClick={() => setSelectedNodeId(item.childId)}
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TreeNode({ node, level, selectedNodeId, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children || []).length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <li className="materials-tree-node">
      <div className={`materials-tree-row ${isSelected ? "selected" : ""}`} style={{ paddingLeft: `${8 + level * 14}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="materials-tree-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
          </button>
        ) : (
          <span className="materials-tree-toggle-placeholder" />
        )}

        <button type="button" className="materials-tree-label" onClick={() => onSelect(node.id)}>
          <FiFolder size={14} />
          <span>{node.label}</span>
        </button>
      </div>

      {hasChildren && expanded && (
        <ul className="materials-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
