export const positions = [
    // front
    [-1.0, -1.0,  1.0],
    [ 1.0, -1.0,  1.0],
    [ 1.0,  1.0,  1.0],
    [-1.0,  1.0,  1.0],
    // back
    [-1.0, -1.0, -1.0],
    [ 1.0, -1.0, -1.0],
    [ 1.0,  1.0, -1.0],
    [-1.0,  1.0, -1.0],
];

export const normals = [
    [ -0.5, -0.5, 0.7071 ],
    [ 0.6324, -0.6324, 0.4472 ],
    [ 0.5, 0.5, 0.7071 ],
    [ -0.6324, 0.6324, 0.4472 ],
    [ -0.6324, -0.6324, -0.4472 ],
    [ 0.5, -0.5, -0.7071 ],
    [ 0.6324, 0.6324, -0.4472 ],
    [ -0.5, 0.5, -0.7071 ]
];

export const elements = [
    // front
    [0, 1, 2],
    [2, 3, 0],
    // top
    [1, 5, 6],
    [6, 2, 1],
    // back
    [7, 6, 5],
    [5, 4, 7],
    // bottom
    [4, 0, 3],
    [3, 7, 4],
    // left
    [4, 5, 1],
    [1, 0, 4],
    // right
    [3, 2, 6],
    [6, 7, 3],
];
