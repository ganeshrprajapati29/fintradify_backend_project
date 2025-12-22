// Data Structures and Algorithms Implementation for HR Backend
// This file contains various DSA algorithms that can be used throughout the backend

/// Sorting Algorithms

/// Quick Sort Algorithm - Efficient for sorting employee lists, attendance records
function quickSort(list, compare) {
  if (list.length <= 1) return list;

  const pivot = list[Math.floor(list.length / 2)];
  const less = list.filter(element => compare(element, pivot) < 0);
  const equal = list.filter(element => compare(element, pivot) === 0);
  const greater = list.filter(element => compare(element, pivot) > 0);

  return [...quickSort(less, compare), ...equal, ...quickSort(greater, compare)];
}

/// Merge Sort Algorithm - Stable sorting for attendance records by date
function mergeSort(list, compare) {
  if (list.length <= 1) return list;

  const mid = Math.floor(list.length / 2);
  const left = mergeSort(list.slice(0, mid), compare);
  const right = mergeSort(list.slice(mid), compare);

  return merge(left, right, compare);
}

function merge(left, right, compare) {
  const result = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
}

/// Heap Sort Algorithm - Good for large datasets like employee salary data
function heapSort(list, compare) {
  const arr = [...list];

  // Build max heap
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    heapify(arr, arr.length, i, compare);
  }

  // Extract elements from heap
  for (let i = arr.length - 1; i > 0; i--) {
    // Swap root with last element
    [arr[0], arr[i]] = [arr[i], arr[0]];

    // Heapify reduced heap
    heapify(arr, i, 0, compare);
  }

  return arr;
}

function heapify(arr, n, i, compare) {
  let largest = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;

  if (left < n && compare(arr[left], arr[largest]) > 0) {
    largest = left;
  }

  if (right < n && compare(arr[right], arr[largest]) > 0) {
    largest = right;
  }

  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest, compare);
  }
}

/// Search Algorithms

/// Binary Search Algorithm - For searching in sorted employee lists
function binarySearch(sortedList, target, compare) {
  let low = 0;
  let high = sortedList.length - 1;

  while (low <= high) {
    const mid = Math.floor(low + (high - low) / 2);
    const comparison = compare(sortedList[mid], target);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1; // Not found
}

/// Linear Search Algorithm - For searching in unsorted lists
function linearSearch(list, target, equals) {
  for (let i = 0; i < list.length; i++) {
    if (equals(list[i], target)) {
      return i;
    }
  }
  return -1; // Not found
}

/// Data Structures

/// Hash Table Implementation - For fast employee lookup by ID
class HashTable {
  constructor(size) {
    this._buckets = Array.from({ length: size }, () => []);
    this._size = size;
  }

  _hash(key) {
    return Math.abs(key.toString().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % this._size;
  }

  put(key, value) {
    const index = this._hash(key);
    const bucket = this._buckets[index];

    // Remove existing entry if present
    const existingIndex = bucket.findIndex(entry => entry.key === key);
    if (existingIndex !== -1) {
      bucket.splice(existingIndex, 1);
    }

    bucket.push({ key, value });
  }

  get(key) {
    const index = this._hash(key);
    const bucket = this._buckets[index];

    const entry = bucket.find(entry => entry.key === key);
    return entry ? entry.value : null;
  }

  remove(key) {
    const index = this._hash(key);
    const bucket = this._buckets[index];
    const existingIndex = bucket.findIndex(entry => entry.key === key);
    if (existingIndex !== -1) {
      bucket.splice(existingIndex, 1);
    }
  }

  containsKey(key) {
    return this.get(key) !== null;
  }

  get values() {
    return this._buckets.flat().map(entry => entry.value);
  }

  get keys() {
    return this._buckets.flat().map(entry => entry.key);
  }
}

/// Binary Search Tree - For hierarchical employee structures
class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor(compare) {
    this.root = null;
    this.compare = compare;
  }

  insert(value) {
    this.root = this._insert(this.root, value);
  }

  _insert(node, value) {
    if (node === null) return new TreeNode(value);

    if (this.compare(value, node.value) < 0) {
      node.left = this._insert(node.left, value);
    } else {
      node.right = this._insert(node.right, value);
    }

    return node;
  }

  contains(value) {
    return this._contains(this.root, value);
  }

  _contains(node, value) {
    if (node === null) return false;

    const comparison = this.compare(value, node.value);
    if (comparison === 0) return true;
    if (comparison < 0) return this._contains(node.left, value);
    return this._contains(node.right, value);
  }

  inOrderTraversal() {
    const result = [];
    this._inOrder(this.root, result);
    return result;
  }

  _inOrder(node, result) {
    if (node !== null) {
      this._inOrder(node.left, result);
      result.push(node.value);
      this._inOrder(node.right, result);
    }
  }
}

/// Graph Implementation - For employee relationships and task dependencies
class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }

  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(vertex1, vertex2, directed = false) {
    this.addVertex(vertex1);
    this.addVertex(vertex2);

    this.adjacencyList.get(vertex1).push(vertex2);
    if (!directed) {
      this.adjacencyList.get(vertex2).push(vertex1);
    }
  }

  getNeighbors(vertex) {
    return this.adjacencyList.get(vertex) || [];
  }

  depthFirstSearch(start) {
    const visited = new Set();
    const result = [];

    this._dfs(start, visited, result);
    return result;
  }

  _dfs(vertex, visited, result) {
    if (visited.has(vertex)) return;

    visited.add(vertex);
    result.push(vertex);

    for (const neighbor of this.getNeighbors(vertex)) {
      this._dfs(neighbor, visited, result);
    }
  }

  breadthFirstSearch(start) {
    const visited = new Set();
    const queue = [];
    const result = [];

    queue.push(start);
    visited.add(start);

    while (queue.length > 0) {
      const vertex = queue.shift();
      result.push(vertex);

      for (const neighbor of this.getNeighbors(vertex)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return result;
  }
}

/// Dynamic Programming - For leave scheduling optimization
class LeaveScheduler {
  /// Calculate maximum consecutive leave days without violating company policy
  maxConsecutiveLeaves(leaveDays, maxConsecutive) {
    let maxLeaves = 0;
    let currentStreak = 0;

    for (const day of leaveDays) {
      if (day) {
        currentStreak++;
        maxLeaves = Math.max(maxLeaves, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxLeaves <= maxConsecutive ? maxLeaves : maxConsecutive;
  }

  /// Optimize leave distribution across team members
  optimizeTeamLeaves(teamLeaves, minTeamCoverage) {
    // Simple greedy approach: sort employees by leave count and adjust
    const sortedEmployees = Object.keys(teamLeaves).sort((a, b) =>
      teamLeaves[b].length - teamLeaves[a].length
    );

    const optimized = {};

    for (const employee of sortedEmployees) {
      const leaves = [...teamLeaves[employee]];

      // Remove leaves that would violate minimum coverage
      const validLeaves = [];
      for (const leave of leaves) {
        const teamCoverage = this._calculateTeamCoverage(teamLeaves, leave, employee);
        if (teamCoverage >= minTeamCoverage) {
          validLeaves.push(leave);
        }
      }

      optimized[employee] = validLeaves;
    }

    return optimized;
  }

  _calculateTeamCoverage(teamLeaves, date, excludeEmployee) {
    let coverage = 0;
    for (const employee in teamLeaves) {
      if (employee !== excludeEmployee && !teamLeaves[employee].includes(date)) {
        coverage++;
      }
    }
    return coverage;
  }
}

/// Utility functions for HR-specific use cases

/// Sort employees by name using quick sort
function sortEmployeesByName(employees) {
  return quickSort(employees, (a, b) => a.name.localeCompare(b.name));
}

/// Sort attendance records by date using merge sort (stable sort)
function sortAttendanceByDate(attendance) {
  return mergeSort(attendance, (a, b) => {
    const dateA = new Date(a.date || a.createdAt || '1970-01-01');
    const dateB = new Date(b.date || b.createdAt || '1970-01-01');
    return dateB - dateA; // Descending order (newest first)
  });
}

/// Search employee by ID using binary search (requires sorted list)
function searchEmployeeById(employees, targetId) {
  const sortedEmployees = sortEmployeesByName(employees);
  const index = binarySearch(sortedEmployees, { employeeId: targetId }, (a, b) =>
    a.employeeId.localeCompare(b.employeeId)
  );

  return index !== -1 ? sortedEmployees[index] : null;
}

/// Calculate working hours using dynamic programming approach
function calculateTotalWorkingHours(attendanceRecords) {
  let totalHours = 0.0;

  for (const record of attendanceRecords) {
    const punchIn = record.punchIn;
    const punchOut = record.punchOut;

    if (punchIn && punchOut) {
      const inTime = new Date(punchIn);
      const outTime = new Date(punchOut);
      const hours = (outTime - inTime) / (1000 * 60 * 60); // Convert milliseconds to hours
      totalHours += hours;
    }
  }

  return totalHours;
}

/// Employee hierarchy using tree structure
class EmployeeHierarchy {
  constructor() {
    this.hierarchy = new BinarySearchTree((a, b) => a.level - b.level);
  }

  addEmployee(employee) {
    this.hierarchy.insert(employee);
  }

  getEmployeesByLevel() {
    return this.hierarchy.inOrderTraversal();
  }

  hasEmployee(employee) {
    return this.hierarchy.contains(employee);
  }
}

module.exports = {
  quickSort,
  mergeSort,
  heapSort,
  binarySearch,
  linearSearch,
  HashTable,
  BinarySearchTree,
  Graph,
  LeaveScheduler,
  sortEmployeesByName,
  sortAttendanceByDate,
  searchEmployeeById,
  calculateTotalWorkingHours,
  EmployeeHierarchy
};
