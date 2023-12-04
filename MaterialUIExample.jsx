import React from 'react'
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import AdbIcon from '@mui/icons-material/Adb';
import Carousel from 'react-material-ui-carousel'
import { Paper, } from '@mui/material'
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import {CardActionArea, CardActions } from '@mui/material';


const pages = ['Home', 'Shop', 'Product', 'About', 'Contact'];
const settings = ['Profile', 'Account', 'Cart', 'Wishlist', 'Logout'];

var items = [
    {
       pic : "assets/image/pr1.jpg"
    },
    {
      pic : "assets/image/pr2.jpg"
    },
    {
        pic : "assets/image/pr3.jpg"
     },
     {
       pic : "assets/image/pr4.jpg"
     },
     {
        pic : "assets/image/pr5.jpg"
     },
     {
       pic : "assets/image/pr6.jpg"
     },
     {
        pic : "assets/image/pr7.jpg"
     },
     {
       pic : "assets/image/pr8.jpg"
     },
     {
        pic : "assets/image/pr9.jpg"
     },
     {
       pic : "assets/image/pr10.jpg"
     }
]

function Item(props) {
    return (
        <Paper>
           <img src={props.item.pic} alt="" className='w-100' height="550px" />
        </Paper>
    )
}

export default function MaterialUIExample() {
    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };
    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };
    return (
        <>
            <AppBar position="static" className='background1'>
                <Container maxWidth="xl">
                    <Toolbar disableGutters>
                        <AdbIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
                        <Typography
                            variant="h6"
                            noWrap
                            component="a"
                            href="/"
                            sx={{
                                mr: 2,
                                display: { xs: 'none', md: 'flex' },
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '.3rem',
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            LOGO
                        </Typography>

                        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                            <IconButton
                                size="large"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleOpenNavMenu}
                                color="inherit"
                            >
                                <MenuIcon />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorElNav}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'left',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'left',
                                }}
                                open={Boolean(anchorElNav)}
                                onClose={handleCloseNavMenu}
                                sx={{
                                    display: { xs: 'block', md: 'none' },
                                }}
                            >
                                {pages.map((page) => (
                                    <MenuItem key={page} onClick={handleCloseNavMenu}>
                                        <Typography textAlign="center">{page}</Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>
                        <AdbIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
                        <Typography
                            variant="h5"
                            noWrap
                            component="a"
                            href=""
                            sx={{
                                mr: 2,
                                display: { xs: 'flex', md: 'none' },
                                flexGrow: 1,
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '.3rem',
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            LOGO
                        </Typography>
                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                            {pages.map((page) => (
                                <Button
                                    key={page}
                                    onClick={handleCloseNavMenu}
                                    sx={{ my: 2, color: 'white', display: 'block' }}
                                >
                                    {page}
                                </Button>
                            ))}
                        </Box>

                        <Box sx={{ flexGrow: 0 }}>
                            <Tooltip title="Open settings">
                                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                    <Avatar alt="Remy Sharp" src="assets/image/pro.jpg" />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                sx={{ mt: '45px' }}
                                id="menu-appbar"
                                anchorEl={anchorElUser}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorElUser)}
                                onClose={handleCloseUserMenu}
                            >
                                {settings.map((setting) => (
                                    <MenuItem key={setting} onClick={handleCloseUserMenu}>
                                        <Typography textAlign="center">{setting}</Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>
            <Carousel>
                {
                    items.map((item, i) => <Item key={i} item={item} />)
                }
            </Carousel>
            <h4 className='background p-1 text-center '>Letest Product Section</h4>
            <Box sx={{ flexGrow: 1 }}>
     <Grid container spacing={2}>
     <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p1.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p2.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p3.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p4.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p5.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p6.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p7.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p8.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p9.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p10.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p11.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p12.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p13.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p14.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p15.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p16.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} l={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p17.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
        <Grid xl={2} lg={3} md={4} sm={6} xs={12} >
      <Card sx={{ maxWidth: 345 }} className="mt-3">
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image="assets/image/p18.jpg"
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            Product Tittle 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
           Price : ₹<del>5500</del><sub>4700</sub>
           <br/>
           <br/>
           Discount : 60%
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Button size="small" color="primary" className='w-100 background1 text-light'>
          Add to Cart
        </Button>
      </CardActions>
    </Card>
        </Grid>
     </Grid>
        </Box>
        </>
    )
}
