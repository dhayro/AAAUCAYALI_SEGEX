const Documento = require('./Documento');
const Expediente = require('./Expediente');
const TipoDocumento = require('./TipoDocumento');

Documento.belongsTo(Expediente, { foreignKey: 'id_expediente' });
Documento.belongsTo(TipoDocumento, { foreignKey: 'id_tipo_documento' });

Expediente.hasMany(Documento, { foreignKey: 'id_expediente' });
TipoDocumento.hasMany(Documento, { foreignKey: 'id_tipo_documento' });