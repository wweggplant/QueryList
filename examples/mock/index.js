const mockMap = {
  'GET /api/getQueryListData': (req, res) => {
    // res.status(500).send('Internal Server Error');
    // return
    // express response delay 2000ms
    const { page, size } = req.query;
    setTimeout(() => {
      res.json({
        data: {
          current: +page,
          total:18,
          list: [
            // array
            {
              id: 1,
              username: 'kenny1',
              sex: 6,
              cname: `cname1${page}`,
              email: `email${page}`,
              mobile: `mobile1${page}`,
              department_name: `department_name1${page}`,
            },
            {
              id: 2,
              username: 'kenny2',
              sex: 6,
              cname: `cname2${page}`,
              email: `email2${page}`,
              mobile: `mobile2${page}`,
              department_name: `department_name2${page}`,
            },
            {
              id: 3,
              username: 'kenny3',
              sex: 6,
              cname: `cname3${page}`,
              email: `email3${page}`,
              mobile: `mobile3${page}`,
              department_name: `department_name3${page}`,
            }
          ]
        }
      });
    }, 500)

  },
  'DELETE /api/user/:id': (req, res) => {
    console.log('---->', req.body);
    console.log('---->', req.params.id); // request params
    res.send({ status: 'ok', message: 'delete success!' });
  },
};
module.exports = mockMap;