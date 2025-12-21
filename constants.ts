
export const ADMIN_CREDENTIALS = {
  username: 'operacional_ssz',
  password: 'Operacional_SSZ'
};

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  // A regex agora valida o conjunto de caracteres permitidos (letras, números e especiais) 
  // e o tamanho mínimo, sem forçar a presença de todos os tipos simultaneamente, 
  // alinhando-se ao "podendo ter" do requisito.
  pattern: /^[A-Za-z\d@$!%*?&._]{8,}$/
};
