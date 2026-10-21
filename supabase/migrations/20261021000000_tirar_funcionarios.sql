-- Funcionários saíram do produto: as perguntas "Quem te atendeu?" ficam arquivadas (somem do formulário e do editor).
-- Nada é apagado: a tabela funcionarios e as respostas antigas continuam no banco, e dá para desarquivar.
update public.perguntas set arquivada = true where tipo = 'funcionario' and not arquivada;
