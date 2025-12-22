// Test file for DSA algorithms
const {
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
} = require('./utils/dsa_algorithms');

console.log('Testing DSA Algorithms...\n');

// Test sorting algorithms
console.log('1. Testing Sorting Algorithms:');
const testArray = [3, 1, 4, 1, 5, 9, 2, 6];
const compare = (a, b) => a - b;

console.log('Original array:', testArray);
console.log('QuickSort:', quickSort([...testArray], compare));
console.log('MergeSort:', mergeSort([...testArray], compare));
console.log('HeapSort:', heapSort([...testArray], compare));

// Test searching algorithms
console.log('\n2. Testing Searching Algorithms:');
const sortedArray = [1, 2, 3, 4, 5, 6, 9];
console.log('Sorted array:', sortedArray);
console.log('Binary search for 4:', binarySearch(sortedArray, 4, compare));
console.log('Binary search for 7:', binarySearch(sortedArray, 7, compare));
console.log('Linear search for 4:', linearSearch(sortedArray, 4, (a, b) => a === b));
console.log('Linear search for 7:', linearSearch(sortedArray, 7, (a, b) => a === b));

// Test HashTable
console.log('\n3. Testing HashTable:');
const hashTable = new HashTable(10);
hashTable.put('key1', 'value1');
hashTable.put('key2', 'value2');
console.log('HashTable get key1:', hashTable.get('key1'));
console.log('HashTable contains key2:', hashTable.containsKey('key2'));
console.log('HashTable keys:', hashTable.keys);
console.log('HashTable values:', hashTable.values);

// Test BinarySearchTree
console.log('\n4. Testing BinarySearchTree:');
const bst = new BinarySearchTree(compare);
bst.insert(5);
bst.insert(3);
bst.insert(7);
bst.insert(1);
bst.insert(9);
console.log('BST contains 7:', bst.contains(7));
console.log('BST contains 10:', bst.contains(10));
console.log('BST in-order traversal:', bst.inOrderTraversal());

// Test Graph
console.log('\n5. Testing Graph:');
const graph = new Graph();
graph.addVertex('A');
graph.addVertex('B');
graph.addVertex('C');
graph.addEdge('A', 'B');
graph.addEdge('B', 'C');
console.log('Graph neighbors of A:', graph.getNeighbors('A'));
console.log('DFS from A:', graph.depthFirstSearch('A'));
console.log('BFS from A:', graph.breadthFirstSearch('A'));

// Test LeaveScheduler
console.log('\n6. Testing LeaveScheduler:');
const leaveScheduler = new LeaveScheduler();
const leaveDays = [true, true, false, true, true, true, false];
console.log('Max consecutive leaves (max 3):', leaveScheduler.maxConsecutiveLeaves(leaveDays, 3));

// Test HR utility functions
console.log('\n7. Testing HR Utility Functions:');
const employees = [
  { name: 'John Doe', employeeId: 'EMP002' },
  { name: 'Alice Smith', employeeId: 'EMP001' },
  { name: 'Bob Johnson', employeeId: 'EMP003' }
];
console.log('Sorted employees by name:', sortEmployeesByName(employees));

const attendance = [
  { date: '2023-10-01', createdAt: '2023-10-01' },
  { date: '2023-09-15', createdAt: '2023-09-15' }
];
console.log('Sorted attendance by date:', sortAttendanceByDate(attendance));

console.log('Search employee by ID EMP001:', searchEmployeeById(employees, 'EMP001'));

const attendanceRecords = [
  { punchIn: '2023-10-01T09:00:00Z', punchOut: '2023-10-01T17:00:00Z' },
  { punchIn: '2023-10-02T09:00:00Z', punchOut: '2023-10-02T16:30:00Z' }
];
console.log('Total working hours:', calculateTotalWorkingHours(attendanceRecords));

// Test EmployeeHierarchy
console.log('\n8. Testing EmployeeHierarchy:');
const hierarchy = new EmployeeHierarchy();
hierarchy.addEmployee({ name: 'Manager', level: 1 });
hierarchy.addEmployee({ name: 'Employee1', level: 2 });
hierarchy.addEmployee({ name: 'Employee2', level: 2 });
console.log('Employees by level:', hierarchy.getEmployeesByLevel());
console.log('Has employee Manager:', hierarchy.hasEmployee({ name: 'Manager', level: 1 }));

console.log('\nAll tests completed successfully!');
