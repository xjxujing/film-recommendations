import { FC, useState } from 'react';

interface SquareProps {
  value: string;
  onClick: () => void;
}
type SquareValue = 'X' | 'O' | '';

const Square: FC<SquareProps> = ({ value, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="h-12 w-12 border border-gray-300 bg-white"
    >
      {value}
    </button>
  );
};

const calculateWinner = (squares: SquareValue[]) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;

    if (squares[a] && squares[b] === squares[a] && squares[b] === squares[c]) {
      console.log('calculateWinner');

      return squares[a];
    }
  }

  return null;
};

function App() {
  const initialSquares = new Array(3 * 3).fill('');
  const [squares, setSquares] = useState(initialSquares);
  const [nextPlayer, setNextPlayer] = useState<SquareValue>('X');
  const [hasWinner, setHasWinner] = useState(false);

  const handleClick = (n: number) => {
    if (hasWinner) return;

    const nextSquares = [...squares];
    nextSquares[n] = nextPlayer;
    const winner = calculateWinner(nextSquares);
    setSquares(nextSquares);

    if (!winner) {
      setNextPlayer(nextPlayer === 'X' ? 'O' : 'X');
    } else {
      setHasWinner(true);
    }
  };

  return (
    <>
      <p>Tic Tac Toe</p>
      <p>
        {hasWinner ? 'Winner' : 'Next Player'}: {nextPlayer}
      </p>

      <div className="inline-grid grid-cols-3">
        <Square value={squares[0]} onClick={() => handleClick(0)} />
        <Square value={squares[1]} onClick={() => handleClick(1)} />
        <Square value={squares[2]} onClick={() => handleClick(2)} />

        <Square value={squares[3]} onClick={() => handleClick(3)} />
        <Square value={squares[4]} onClick={() => handleClick(4)} />
        <Square value={squares[5]} onClick={() => handleClick(5)} />

        <Square value={squares[6]} onClick={() => handleClick(6)} />
        <Square value={squares[7]} onClick={() => handleClick(7)} />
        <Square value={squares[8]} onClick={() => handleClick(8)} />
      </div>
    </>
  );
}

export default App;
