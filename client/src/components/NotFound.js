import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const NotFoundContainer = styled.section`
  padding: 40px 0;
  background: #fff;
  font-family: "Arvo", serif;
  text-align: center;
`;

const Background404 = styled.div`
  background-image: url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif);
  height: 400px;
  background-position: center;
  background-repeat: no-repeat;
`;

const Title = styled.h1`
  font-size: 80px;
  margin: 0;
`;

const Message = styled.h3`
  font-size: 30px;
  margin-top: 20px;
`;

const HomeLink = styled(Link)`
  color: #fff !important;
  padding: 10px 20px;
  background: #39ac31;
  margin: 20px 0;
  display: inline-block;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  &:hover {
    background: #2d8a27;
  }
`;

const NotFound = () => {
    return (
        <NotFoundContainer>
            <div className="container">
                <div className="row">
                    <div className="col-sm-12">
                        <div className="col-sm-10 col-sm-offset-1 text-center">
                            <Background404>
                                <Title>404</Title>
                            </Background404>
                            <div>
                                <Message>Look like you're lost</Message>
                                <p>The page you are looking for is not available!</p>
                                <HomeLink to="/">Go to Home</HomeLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </NotFoundContainer>
    );
};

export default NotFound;