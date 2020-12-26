import React, { Component } from "react";
import { Button } from 'react-bootstrap';
import history from './../history';
import "../css/Home.css";
import Flickity from "flickity";
import "../../node_modules/flickity/css/flickity.css";
import "../../node_modules/flickity/dist/flickity.min.css";
import axios from 'axios';

export default class Home extends Component {

  constructor(props) {
    super(props);
    this.state = {
      clubs: []
    }

    this.getAllClubs = this.getAllClubs.bind(this);
    this.extractData = this.extractData.bind(this);
    this.getAllClubs();
  }

  extractData(response) {
    var responseData = response.data['data'];
    for (var i = 0; i < 5; i++) {
      var localClubs = this.state.clubs;
      localClubs.push({ title: responseData[i]['name'] });
      this.setState({ clubs: localClubs })
      console.log("IN EXTRACTDATA:")
      console.log(this.state.clubs.length)
    }
  }

  getAllClubs() {
    axios({
      method: 'GET',
      url: 'http://127.0.0.1:5000/api/clubs',
    })
      .then((response) => this.extractData(response))
      .catch(function (error) {
        console.log(error)
      })
  }

  render() {
    return (
      <div className="Home">
        <div class="home-page-container">
          <DisplayPic />
          <SubscribedClubs clubs={this.state.clubs} />
        </div>
      </div>
    );
  }
}

class DisplayPic extends Component {
  render() {
    return (
      <div class="pic-display">
        <div class="gallery js-flickity" data-flickity-options='{ "freeScroll": true, "wrapAround": true, "autoPlay":4000}'>
          <img class="gallery-cell" src={require("./display_pic1.jpeg")} alt="" ></img>
          <img class="gallery-cell" src={require("./display_pic2.jpeg")} alt=""></img>
          <img class="gallery-cell" src={require("./display_pic3.jpeg")}></img>
        </div>
      </div>
    );
  }
}

class SubscribedClubs extends Component {
  render() {
    var clubComponent = this.props.clubs.map(club =>
      <span class="club-bg">
        <MyClub title={club.title} logo={require("./club_logo2.png")} />
      </span>
    );

    return (
      <div class="subscribed-pane">
        <text>Most interested Clubs</text>
        <div class="club-list">
          {clubComponent}
          <span class="club-bg">
            <div class="more-bg">
              <div class='dot' />
              <div class='dot' />
              <div class='dot' />
            </div>
          </span>
        </div>
      </div>
    )
  }
}

class MyClub extends Component {
  constructor(props) {
    super(props);
    this.state = {
      title: null,
      logo: null,
    }
    this.ToClubHomePage = this.ToClubHomePage.bind(this);
  }

  ToClubHomePage(event) {
    console.log("Sheldon")
    history.push('../Clubs/ClubHome');/* need implement */
    window.location.reload();
  }

  render() {
    return (
      <div class='club-logo' onClick={this.ToClubHomePage}>
        <img title={this.props.title} src={this.props.logo} alt={this.props.title} />
      </div>
    )
  }
}