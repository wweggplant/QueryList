const { faker } = require('@faker-js/faker');
const mockMap = {
  'GET /api/getQueryListData': (req, res) => {
    const { page } = req.query;
    const size = req.query.size ?? 100;
    const TOTAL_PAGES = 5;
    const TOTAL_ITEMS = TOTAL_PAGES * size;

    const list = Array.from({ length: size }).map(() => ({
      id: faker.datatype.uuid(),
      username: faker.internet.userName(),
      sex: faker.datatype.number({ min: 1, max: 2 }),
      cname: faker.internet.userName(),
      email: faker.internet.email(),
      mobile: faker.phone.number(),
      department_name: faker.commerce.department(),
    }));

    setTimeout(() => {
      res.json({
        data: {
          current: +page,
          total: TOTAL_ITEMS,
          list
        }
      });
    }, 500);
  },
  'DELETE /api/user/:id': (req, res) => {
    console.log('---->', req.body);
    console.log('---->', req.params.id);
    res.send({ status: 'ok', message: 'delete success!' });
  },
};

module.exports = mockMap;
