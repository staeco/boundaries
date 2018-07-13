import through2 from 'through2'

export default () =>
  through2.obj((cmd, _, cb) => {
    let arg
    const op = cmd.shift();
    const aof = [
      '*' + (cmd.length + 1),
      '$' + op.length,
      op
    ];
    while (cmd.length) {
      arg = cmd.shift();
      aof.push('$' + arg.length);
      aof.push(arg);
    }

    cb(null, aof.join('\r\n') + '\r');
  })
